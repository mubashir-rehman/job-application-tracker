// JD-parse pipeline as a LangGraph StateGraph. Runs in-process inside one
// serverless request (free-tier friendly: no checkpointer, no LangGraph Server).
//
//   ingest ─→ [route] ──key──→ llm (full extraction, regex backstop) ─→ finalize
//                 └──no key──→ deterministic (regex/heuristics) ───────→ finalize
//
// With an API key the LLM owns extraction (regex is too brittle for the long tail
// of JD phrasings); deterministic is the key-less path and the safety net if the
// LLM call or its JSON parse fails.
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

// Content fields the LLM extracts in full. `appliedVia` is intentionally excluded
// (it's inferred from the source URL/host, not the JD prose — left to deterministic).
const LLM_KEYS = ['companyName', 'targetRole', 'workModel', 'location', 'salaryRange', 'otherBenefits', 'hrContact', 'keyRequirements', 'techTags'] as const;
const WORK_MODELS = new Set(['Remote', 'Hybrid', 'Onsite']);

const LLM_SYSTEM = `You extract structured fields from a job posting for an application tracker.
Return ONLY a JSON object with exactly these keys (no prose, no code fences):
{ "companyName", "targetRole", "workModel", "location", "salaryRange", "otherBenefits", "hrContact", "keyRequirements", "techTags" }

Truth only — accuracy over completeness. Any field not stated → null (techTags → []):
- companyName: the actual hiring company. If a recruiting agency posts for a client
  ("Our client X is hiring …"), use the CLIENT (X), not the agency; strip framing
  like "Our client".
- targetRole: the posted job title only — normalized casing, req IDs stripped. Do
  NOT include the location or trailing filler ("… in Lahore") in the title.
- workModel: exactly one of "Remote","Hybrid","Onsite", or null. Base it on the
  stated arrangement, NOT on a company name that merely contains the word "remote".
- location: the job's city/region/country if stated; else null. "Remote" is a work
  model, not a location.
- salaryRange: the posted pay copied VERBATIM (e.g. "$120k–$150k", "$2,500 / month").
  No pay posted → null. NEVER estimate or infer a market rate.
- otherBenefits: posted perks/equity/benefits, briefly; else null.
- hrContact: a recruiter name and/or email ONLY if it literally appears in the
  posting. NEVER guess or construct an email. Else null.
- keyRequirements: a tight comma-separated digest of must-have skills/experience (≤ 25 words).
- techTags: array of concrete technologies/tools/frameworks named in the posting
  (e.g. ["Django","GraphQL","PostgreSQL","Stripe"]) — skills only, no soft skills. Else [].`;

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

// With a key, the LLM owns the extraction (regex is too brittle for the long tail
// of JD phrasings). With no key — or if the LLM call/JSON-parse fails — we fall back
// to the deterministic extractor so autofill still works key-free and never empty.
function routeAfterIngest(state: S): 'llm' | 'deterministic' {
  return state.apiKey ? 'llm' : 'deterministic';
}

function safeJson(raw: string): Record<string, any> | null {
  const stripped = raw.replace(/```(?:json)?/gi, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(stripped.slice(start, end + 1)); } catch { return null; }
}

function usable(v: any): boolean {
  return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
}

async function llm(state: S): Promise<Partial<S>> {
  let parsed: Record<string, any> | null = null;
  try {
    const raw = await callLLM({
      provider: state.provider || 'anthropic',
      apiKey: state.apiKey!,
      system: LLM_SYSTEM,
      prompt: `JOB POSTING:\n${state.text.slice(0, 8000)}`,
      model: state.model,
      baseUrl: state.baseUrl,
      maxTokens: 2000, // small JSON; fast providers (Gemini thinkingBudget:0 / Anthropic / OpenAI)
                       // answer well within this. In-band reasoners (MiMo) may still exhaust it and
                       // fall back to deterministic below — acceptable graceful degradation.
    });
    parsed = safeJson(raw);
  } catch {
    parsed = null;
  }

  // Deterministic backstop: provides appliedVia (URL-based, not in the LLM output)
  // and fills any field the LLM left null. It is also the full result if the LLM failed.
  const det = deterministicExtract(state.text, state.jdUrl);
  if (!parsed) return { fields: det.fields, found: det.found, usedLLM: false };

  const fields: JdFields = {};
  for (const k of LLM_KEYS) {
    let v = parsed[k];
    if (k === 'workModel' && v != null && !WORK_MODELS.has(v)) v = null; // enforce the enum
    if (usable(v)) (fields as any)[k] = v;
  }
  for (const k of Object.keys(det.fields) as (keyof JdFields)[]) {
    if (fields[k] == null) (fields as any)[k] = det.fields[k];
  }
  return { fields, found: Object.keys(fields), usedLLM: true };
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
  .addConditionalEdges('ingest', routeAfterIngest, { llm: 'llm', deterministic: 'deterministic' })
  .addEdge('deterministic', 'finalize')
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
