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
import { Provider, callLLM, callLLMWithSearch, SearchUnsupportedError } from '../llm.js';
import { serperSearch } from '../search.js';
import { fetchUrlText } from '../fetchText.js';
import { deterministicExtract, JdFields } from '../jdExtract.js';

// Web-search research brief (opt-in `enrich`). Not written into the truth-only
// form fields — it's supporting context the user can act on.
export interface JdResearch {
  companyWebsite?: string;
  summary?: string;
  marketSalaryHint?: string;
  sources?: { title: string; url: string }[];
  via?: 'serper' | 'gemini'; // which search backend produced it
  unsupported?: boolean;      // no search key and no grounded provider
  error?: string;            // search failed (e.g. out of credits)
}

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
  enrich: Annotation<boolean | undefined>(),
  searchKey: Annotation<string | undefined>(),
  research: Annotation<JdResearch | null>({ reducer: (_a, b) => b, default: () => null }),
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

// Opt-in company research. Prefers serper.dev (a dedicated search API — no LLM
// tokens, just search credits); falls back to Gemini grounding. Never writes the
// truth-only form fields; sources are real URLs the user still verifies.
async function enrichNode(state: S): Promise<Partial<S>> {
  const company = state.fields.companyName;
  if (!company) return {};
  if (state.searchKey) return { research: await enrichViaSerper(state, company) };
  if (state.apiKey) return { research: await enrichViaGemini(state, company) };
  return { research: { unsupported: true } };
}

// serper.dev: knowledgeGraph → website + summary; organic → sources; one extra
// search for a market range only when no salary was posted.
// Aggregator/social hosts that are never the company's own homepage.
const NON_HOMEPAGE = /(?:^|\.)(?:linkedin|x|twitter|facebook|instagram|wikipedia|glassdoor|indeed|crunchbase|youtube|github|medium|bloomberg|reddit)\.[a-z.]+$/i;

function homepageFromOrganic(organic?: { link?: string }[]): string | undefined {
  for (const o of organic || []) {
    if (!o.link) continue;
    try {
      const host = new URL(o.link).hostname.replace(/^www\./, '');
      if (!NON_HOMEPAGE.test(host)) return `https://${host}`;
    } catch { /* skip malformed URL */ }
  }
  return undefined;
}

async function enrichViaSerper(state: S, company: string): Promise<JdResearch> {
  const role = state.fields.targetRole;
  try {
    const main = await serperSearch(state.searchKey!, company);
    const kg = main.knowledgeGraph || {};
    const sources = (main.organic || [])
      .slice(0, 4)
      .map((o) => ({ title: o.title || '', url: o.link || '' }))
      .filter((s) => s.url);

    let marketSalaryHint: string | undefined;
    if (!state.fields.salaryRange && role) {
      try {
        const sal = await serperSearch(state.searchKey!, `${role} salary at ${company}`, 4);
        const snip = sal.answerBox?.answer || sal.answerBox?.snippet || sal.organic?.[0]?.snippet;
        if (snip) marketSalaryHint = String(snip).slice(0, 220);
        (sal.organic || []).slice(0, 2).forEach((o) => { if (o.link) sources.push({ title: o.title || '', url: o.link }); });
      } catch { /* salary lookup is best-effort */ }
    }

    return {
      via: 'serper',
      companyWebsite: kg.website || homepageFromOrganic(main.organic) || undefined,
      summary: kg.description || undefined,
      marketSalaryHint,
      sources: sources.slice(0, 5),
    };
  } catch (e) {
    return { via: 'serper', error: (e as Error).message };
  }
}

async function enrichViaGemini(state: S, company: string): Promise<JdResearch> {
  const prompt = [
    `Research the company "${company}"${state.fields.targetRole ? ` (hiring a ${state.fields.targetRole})` : ''} using web search.`,
    `Return ONLY a JSON object: {"companyWebsite": string|null, "summary": string|null, "marketSalaryHint": string|null}`,
    `- companyWebsite: the official website URL.`,
    `- summary: one factual sentence on what the company does.`,
    state.fields.salaryRange
      ? `- marketSalaryHint: null (a salary was already posted).`
      : `- marketSalaryHint: a typical market pay range for this role/level with the source, e.g. "$120k–$150k (Levels.fyi)". Only if you find real data; else null.`,
    `Use only information you can find via search. Do not fabricate. Output the JSON only.`,
  ].join('\n');

  try {
    const { text, sources } = await callLLMWithSearch({
      provider: state.provider || 'gemini',
      apiKey: state.apiKey!,
      prompt,
      model: state.model,
      maxTokens: 700,
    });
    const parsed = safeJson(text) || {};
    return {
      via: 'gemini',
      companyWebsite: parsed.companyWebsite || undefined,
      summary: parsed.summary || undefined,
      marketSalaryHint: parsed.marketSalaryHint || undefined,
      sources: sources.slice(0, 5),
    };
  } catch (e) {
    if (e instanceof SearchUnsupportedError) return { unsupported: true };
    return { via: 'gemini', error: (e as Error).message };
  }
}

function enrichRoute(state: S): 'enrich' | 'end' {
  const canSearch = !!state.searchKey || !!state.apiKey;
  return state.enrich && canSearch && state.fields.companyName ? 'enrich' : 'end';
}

const graph = new StateGraph(State)
  .addNode('ingest', ingest)
  .addNode('deterministic', deterministic)
  .addNode('llm', llm)
  .addNode('finalize', finalize)
  .addNode('enrichStep', enrichNode)
  .addEdge(START, 'ingest')
  .addEdge('ingest', 'deterministic')
  .addConditionalEdges('deterministic', route, { llm: 'llm', finalize: 'finalize' })
  .addEdge('llm', 'finalize')
  .addConditionalEdges('finalize', enrichRoute, { enrich: 'enrichStep', end: END })
  .addEdge('enrichStep', END)
  .compile();

export interface JdParseInput {
  jdText?: string;
  jdUrl?: string;
  apiKey?: string;
  provider?: Provider;
  model?: string;
  baseUrl?: string;
  enrich?: boolean; // opt-in web-search research on the company
  searchKey?: string; // serper.dev key — preferred search backend when present
}

export interface JdParseResult {
  fields: JdFields;
  gaps: string[];
  usedLLM: boolean;
  fetched: boolean;
  research?: JdResearch | null;
}

export async function runJdParse(input: JdParseInput): Promise<JdParseResult> {
  const out = await graph.invoke(input);
  return { fields: out.fields, gaps: out.gaps, usedLLM: !!out.usedLLM, fetched: !!out.fetched, research: out.research };
}
