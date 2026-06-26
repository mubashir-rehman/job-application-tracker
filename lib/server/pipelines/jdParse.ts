// JD-parse pipeline as a LangGraph StateGraph. Runs in-process inside one
// serverless request (free-tier friendly: no checkpointer, no LangGraph Server).
//
//   ingest ─→ deterministic ─→ [route] ──skip──→ finalize
//                                 │ (core fields missing & key present)
//                                 └─→ llm (gap-fill only) ─→ finalize
//
// The LLM node is skipped entirely for well-structured posts, and the whole
// graph runs key-less (deterministic-only) when no API key is supplied.
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { Provider, callLLM } from '../llm';
import { fetchUrlText } from '../fetchText';
import { deterministicExtract, JdFields } from '../jdExtract';

// The fields the LLM may fill (provider's own keys excluded — those are inferred).
const LLM_FILLABLE = ['companyName', 'targetRole', 'workModel', 'location', 'salaryRange', 'otherBenefits', 'hrContact', 'keyRequirements'] as const;

const LLM_SYSTEM = `You extract missing fields from a job posting for an application tracker.
Some fields were already found by deterministic parsing — do NOT change those.
Return ONLY a JSON object containing exactly the requested missing keys (no prose, no code fences).

Truth only — accuracy over completeness:
- Use solely what the posting states. Unknown → null. Never invent a company,
  role, salary, location, benefit, or recruiter.
- NEVER guess or construct an email address. A recruiter/email goes in hrContact
  ONLY if it literally appears in the posting; otherwise null.
- salaryRange: copy posted pay VERBATIM (e.g. "$120k–$150k"). If no pay is posted,
  null. NEVER estimate or infer a market rate.
- companyName: the hiring company (not a job board or recruiting agency unless that
  is the only employer named).
- targetRole: the posted title, normalized casing, with req IDs stripped.
- workModel: one of "Remote","Hybrid","Onsite" or null.
- keyRequirements: a tight comma-separated digest of must-have skills/experience (≤ 25 words).`;

const State = Annotation.Root({
  jdText: Annotation<string | undefined>(),
  jdUrl: Annotation<string | undefined>(),
  apiKey: Annotation<string | undefined>(),
  provider: Annotation<Provider | undefined>(),
  model: Annotation<string | undefined>(),
  baseUrl: Annotation<string | undefined>(),
  text: Annotation<string>(),
  fetched: Annotation<boolean>(),
  fields: Annotation<JdFields>({ reducer: (a, b) => ({ ...a, ...b }), default: () => ({}) }),
  found: Annotation<string[]>({ reducer: (a, b) => Array.from(new Set([...(a || []), ...(b || [])])), default: () => [] }),
  usedLLM: Annotation<boolean>(),
  gaps: Annotation<string[]>({ reducer: (_a, b) => b, default: () => [] }),
});
type S = typeof State.State;

async function ingest(state: S): Promise<Partial<S>> {
  const t = state.jdText?.trim();
  if (t) return { text: t, fetched: false };
  if (state.jdUrl) return { text: await fetchUrlText(state.jdUrl), fetched: true };
  throw new Error('Provide a job description or a fetchable URL');
}

function deterministic(state: S): Partial<S> {
  const { fields, found } = deterministicExtract(state.text, state.jdUrl);
  return { fields, found };
}

// Route to the LLM only when the core fields are missing AND a key is available.
function route(state: S): 'llm' | 'finalize' {
  const haveCore = !!state.fields.companyName && !!state.fields.targetRole;
  return state.apiKey && !haveCore ? 'llm' : 'finalize';
}

function safeJson(raw: string): Record<string, any> | null {
  const stripped = raw.replace(/```(?:json)?/gi, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(stripped.slice(start, end + 1)); } catch { return null; }
}

async function llm(state: S): Promise<Partial<S>> {
  const missing = LLM_FILLABLE.filter((k) => state.fields[k] == null);
  if (!missing.length) return { usedLLM: false };

  const prompt = [
    `Already found (do not change): ${JSON.stringify(state.fields)}`,
    `Fill ONLY these missing fields as JSON keys: ${missing.join(', ')}`,
    `JOB POSTING:\n${state.text.slice(0, 8000)}`,
  ].join('\n\n');

  const raw = await callLLM({
    provider: state.provider || 'anthropic',
    apiKey: state.apiKey!,
    system: LLM_SYSTEM,
    prompt,
    model: state.model,
    baseUrl: state.baseUrl,
    maxTokens: 700,
  });

  const parsed = safeJson(raw);
  const merged: JdFields = {};
  if (parsed) {
    for (const k of missing) {
      const v = parsed[k];
      if (v != null && v !== '' && !(Array.isArray(v) && v.length === 0)) (merged as any)[k] = v;
    }
  }
  return { fields: merged, found: Object.keys(merged), usedLLM: true };
}

function finalize(state: S): Partial<S> {
  const f = state.fields;
  const hadKey = !!state.apiKey;
  const gaps: string[] = [];
  if (!f.companyName) gaps.push('Company not detected — add it manually.');
  if (!f.targetRole) gaps.push('Role not detected — add it manually.');
  if (!f.salaryRange) gaps.push('No salary posted — check Levels.fyi / Glassdoor for the market range.');
  if (!f.hrContact) gaps.push("Recruiter not in the post — open the poster's profile to find the contact, then verify the email before using it.");
  if (!hadKey && (!f.companyName || !f.targetRole)) gaps.push('Tip: add an AI key in “AI Keys” to parse prose / one-line JDs.');
  return { gaps };
}

const graph = new StateGraph(State)
  .addNode('ingest', ingest)
  .addNode('deterministic', deterministic)
  .addNode('llm', llm)
  .addNode('finalize', finalize)
  .addEdge(START, 'ingest')
  .addEdge('ingest', 'deterministic')
  .addConditionalEdges('deterministic', route, { llm: 'llm', finalize: 'finalize' })
  .addEdge('llm', 'finalize')
  .addEdge('finalize', END)
  .compile();

export interface JdParseInput {
  jdText?: string;
  jdUrl?: string;
  apiKey?: string;
  provider?: Provider;
  model?: string;
  baseUrl?: string;
}

export interface JdParseResult {
  fields: JdFields;
  gaps: string[];
  usedLLM: boolean;
  fetched: boolean;
}

export async function runJdParse(input: JdParseInput): Promise<JdParseResult> {
  const out = await graph.invoke(input);
  return { fields: out.fields, gaps: out.gaps, usedLLM: !!out.usedLLM, fetched: !!out.fetched };
}
