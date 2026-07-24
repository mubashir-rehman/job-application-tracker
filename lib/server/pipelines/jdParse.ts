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
import { Provider, callLLMStructured, JsonSchema, safeJsonParse } from '../llm.js';
import { groundedCall } from '../agent.js';
import { serperSearch } from '../search.js';
import { fetchUrlText } from '../fetchText.js';
import { deterministicExtract, JdFields } from '../jdExtract.js';

// Web-search research brief (opt-in `enrich`). Not written into the truth-only
// form fields — it's supporting context the user can act on. Fed forward (as
// non-claimable context, never resume facts) into /api/jd/score and
// /api/resume/tailor by the client, which already holds the computed brief.
export interface JdResearch {
  companyWebsite?: string;
  summary?: string;
  marketSalaryHint?: string;
  productOverview?: string;    // 1-2 sentences: what the product/company concretely does
  engCulture?: string;         // eng culture/practices signal, only if genuinely discoverable
  stackSignals?: string[];     // tech signals beyond the JD's own techTags (job posts, eng blog, etc.)
  recentNews?: string[];       // up to 3 short factual recent-news bullets
  experienceMatch?: string;    // candidate's real (master-CV) experience matching what the company
                                // actually does but NOT explicitly asked for in the JD — a suggestion
                                // for the candidate to consider, never a resume claim on its own
  sources?: { title: string; url: string }[];
  via?: string;              // which search backend produced it ('serper', 'anthropic-native', 'agent-loop', …)
  grounded?: boolean;        // false when the LLM answered without live web results
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
  masterMd: Annotation<string | undefined>(),
  researchPromptOverride: Annotation<string | undefined>(),
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

// Structured-output schema for the extraction — passed to `callLLMStructured` so
// Anthropic/OpenAI/Gemini return this shape natively; `safeJsonParse` (from
// llm.ts) is only the last-resort fallback inside that call.
const JD_EXTRACT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    companyName: { type: ['string', 'null'] },
    targetRole: { type: ['string', 'null'] },
    workModel: { type: ['string', 'null'], enum: ['Remote', 'Hybrid', 'Onsite', null] },
    location: { type: ['string', 'null'] },
    salaryRange: { type: ['string', 'null'] },
    otherBenefits: { type: ['string', 'null'] },
    hrContact: { type: ['string', 'null'] },
    keyRequirements: { type: ['string', 'null'] },
    techTags: { type: 'array', items: { type: 'string' } },
  },
  required: [...LLM_KEYS],
  additionalProperties: false,
};

function usable(v: any): boolean {
  return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
}

async function llm(state: S): Promise<Partial<S>> {
  let parsed: Record<string, any> | null = null;
  try {
    const { data } = await callLLMStructured({
      provider: state.provider || 'anthropic',
      apiKey: state.apiKey!,
      system: LLM_SYSTEM,
      prompt: `JOB POSTING:\n${state.text.slice(0, 8000)}`,
      model: state.model,
      baseUrl: state.baseUrl,
      maxTokens: 2000, // small JSON; fast providers (Gemini thinkingBudget:0 / Anthropic / OpenAI)
                       // answer well within this. In-band reasoners (MiMo) may still exhaust it and
                       // fall back to deterministic below — acceptable graceful degradation.
      schema: JD_EXTRACT_SCHEMA,
      schemaName: 'jd_fields',
    });
    parsed = data;
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
// tokens, just search credits); otherwise routes the LLM key through the grounded
// fallback ladder (native provider search → agent loop → ungrounded). Never writes
// the truth-only form fields; sources are real URLs the user still verifies.
// LLM-first: only an LLM can synthesize the narrative brief fields (product,
// culture, stack signals, news, experience-match) from raw search results, so an
// apiKey routes to the grounded path even when a searchKey is also present — the
// grounded fallback ladder still uses that searchKey internally (as the agent
// loop's `web_search` tool) when the provider has no native search. The serper-only
// path remains the keyless-of-LLM fallback: cheap, no tokens, but basic fields only.
async function enrichNode(state: S): Promise<Partial<S>> {
  const company = state.fields.companyName;
  if (!company) return {};
  if (state.apiKey) return { research: await enrichViaGrounded(state, company) };
  if (state.searchKey) return { research: await enrichViaSerper(state, company) };
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

// LLM-key path: run the grounded fallback ladder. Whatever backend answers, we get
// {text, sources, grounded, via} and never a hard "unsupported" error. The prompt
// asks for the full structured brief; JSON is parsed with `safeJsonParse` rather
// than a provider structured-output mode — structured/tool-forced JSON modes don't
// compose with the web-search tool turns the grounded ladder itself uses (Anthropic
// server-side search + a forced tool in the same turn conflict; the OpenAI
// Responses API used for native search is a different endpoint than the
// `response_format: json_schema` Chat Completions path) — so plain JSON-in-prompt +
// `safeJsonParse` is the deliberate, documented approach here, not an oversight.
async function enrichViaGrounded(state: S, company: string): Promise<JdResearch> {
  const masterMd = state.masterMd?.trim();
  const override = state.researchPromptOverride?.trim();
  const prompt = [
    `Research the company "${company}"${state.fields.targetRole ? ` (hiring a ${state.fields.targetRole})` : ''} using web search.`,
    // A user-provided prompt override (Track 4 Prompt Manager) layers ON TOP for
    // emphasis/focus/style — the JSON key contract below stays authoritative so
    // downstream parsing (safeJsonParse expecting this exact shape) keeps working,
    // the same pattern api/resume/tailor.ts uses for tailoring instructions.
    override ? `\n--- ADDITIONAL USER RESEARCH FOCUS ---\n${override}\n` : '',
    `Return ONLY a JSON object with exactly these keys:`,
    `{"companyWebsite": string|null, "summary": string|null, "marketSalaryHint": string|null,`,
    ` "productOverview": string|null, "engCulture": string|null, "stackSignals": string[], "recentNews": string[], "experienceMatch": string|null}`,
    `- companyWebsite: the official website URL.`,
    `- summary: one factual sentence on what the company does.`,
    state.fields.salaryRange
      ? `- marketSalaryHint: null (a salary was already posted).`
      : `- marketSalaryHint: a typical market pay range for this role/level with the source, e.g. "$120k–$150k (Levels.fyi)". Only if you find real data; else null.`,
    `- productOverview: 1-2 sentences on what the product/company concretely builds or does. null if unclear.`,
    `- engCulture: one sentence on engineering culture/practices ONLY if genuinely discoverable (eng blog, reviews); else null. Do not guess.`,
    `- stackSignals: concrete technologies/tools this company is known to use, from real signals (job posts, engineering blog, etc.) beyond what's already in the JD. Empty array if none found.`,
    `- recentNews: up to 3 short factual recent-news bullets (funding, launches, notable events). Empty array if none found.`,
    masterMd
      ? `- experienceMatch: using the MASTER CV EXCERPT below ONLY, 1-2 sentences on what specific real experience matches what this company actually does that the JD text itself doesn't explicitly ask for. This is a suggestion for the candidate to consider, NOT a resume claim — never invent experience. null if no genuine match.`
      : `- experienceMatch: null (no candidate CV was provided).`,
    `Use only information you can find via search; never fabricate. Output the JSON only, no prose, no code fences.`,
    masterMd ? `\n--- MASTER CV EXCERPT (for experienceMatch only — do not use for any other field) ---\n${masterMd.slice(0, 3000)}` : '',
  ].filter(Boolean).join('\n');

  try {
    const { text, sources, grounded, via } = await groundedCall({
      provider: state.provider || 'gemini',
      apiKey: state.apiKey!,
      prompt,
      model: state.model,
      baseUrl: state.baseUrl,
      maxTokens: 900,
      serperKey: state.searchKey, // used by the agent-loop's web_search tool when the provider has no native search
    });
    const parsed = safeJsonParse(text) || {};
    return {
      via,
      grounded,
      companyWebsite: parsed.companyWebsite || undefined,
      summary: parsed.summary || undefined,
      marketSalaryHint: parsed.marketSalaryHint || undefined,
      productOverview: parsed.productOverview || undefined,
      engCulture: parsed.engCulture || undefined,
      stackSignals: Array.isArray(parsed.stackSignals) ? parsed.stackSignals.slice(0, 8).map(String) : undefined,
      recentNews: Array.isArray(parsed.recentNews) ? parsed.recentNews.slice(0, 3).map(String) : undefined,
      experienceMatch: parsed.experienceMatch || undefined,
      sources: sources.slice(0, 5),
    };
  } catch (e) {
    return { error: (e as Error).message };
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
  masterMd?: string; // optional master CV — used ONLY to derive research.experienceMatch
  researchPromptOverride?: string; // Track 4 Prompt Manager override, layered on top of the built-in JSON contract
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

// Render a previously-computed research brief as prompt context for
// /api/jd/score and /api/resume/tailor. Always clearly labeled as background,
// never a claimable fact — truth stays master-CV-only. Shared here so both
// call sites format it identically.
export function formatResearchContext(research?: JdResearch | null): string {
  if (!research) return '';
  const lines: string[] = [];
  if (research.summary) lines.push(`Company summary: ${research.summary}`);
  if (research.productOverview) lines.push(`Product: ${research.productOverview}`);
  if (research.engCulture) lines.push(`Engineering culture: ${research.engCulture}`);
  if (research.stackSignals?.length) lines.push(`Observed stack signals (beyond the JD's own list): ${research.stackSignals.join(', ')}`);
  if (research.recentNews?.length) lines.push(`Recent news: ${research.recentNews.join('; ')}`);
  if (research.experienceMatch) lines.push(`Possible experience overlap to consider — verify before claiming: ${research.experienceMatch}`);
  if (!lines.length) return '';
  return [
    '\n--- SUPPORTING RESEARCH CONTEXT (background only — NEVER a claimable fact; truth remains master-CV-only) ---',
    ...lines,
  ].join('\n');
}
