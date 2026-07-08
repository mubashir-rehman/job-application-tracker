// Frontend client for the HireTrack API (local dev server / Vercel functions).
// BYOK keys travel only in the X-API-Key header, exactly as the backend expects.
import { Provider } from './apiKeys';

async function postJson<T>(path: string, body: unknown, headers: Record<string, string>): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) throw new Error(data.detail || data.error || `Request failed (${res.status})`);
  return data as T;
}

// Headers for a BYOK call. For the 'custom' provider the caller also supplies a
// model and an OpenAI-compatible base URL; built-in providers can omit both.
function byokHeaders(p: { provider: Provider; apiKey: string; model?: string; baseUrl?: string }): Record<string, string> {
  const h: Record<string, string> = { 'X-API-Key': p.apiKey, 'X-Provider': p.provider };
  if (p.model) h['X-Model'] = p.model;
  if (p.baseUrl) h['X-Base-URL'] = p.baseUrl;
  return h;
}

export interface TailorParams {
  provider: Provider;
  apiKey: string;
  masterMd: string;
  jdText: string;
  lane?: string;
  instructions?: string; // user's custom tailoring system prompt (optional)
  model?: string;
  baseUrl?: string;
}

// Tailor a master CV to a job description via POST /api/resume/tailor.
export async function tailorResume(p: TailorParams): Promise<string> {
  const { tailoredMd } = await postJson<{ tailoredMd: string }>(
    '/api/resume/tailor',
    { masterMd: p.masterMd, jdText: p.jdText, lane: p.lane, instructions: p.instructions },
    byokHeaders(p),
  );
  return tailoredMd;
}

export interface ConvertParams {
  provider: Provider;
  apiKey: string;
  rawText: string;
  sourceFormat?: string;
  model?: string;
  baseUrl?: string;
}

// Clean/structure raw extracted resume text into Markdown via POST /api/resume/import.
export async function convertResumeWithAI(p: ConvertParams): Promise<string> {
  const { markdown } = await postJson<{ markdown: string }>(
    '/api/resume/import',
    { rawText: p.rawText, sourceFormat: p.sourceFormat },
    byokHeaders(p),
  );
  return markdown;
}

export interface ParsedJdFields {
  companyName?: string | null;
  targetRole?: string | null;
  workModel?: 'Remote' | 'Hybrid' | 'Onsite' | null;
  location?: string | null;
  salaryRange?: string | null;
  otherBenefits?: string | null;
  hrContact?: string | null;
  appliedVia?: 'LinkedIn' | 'Email' | 'Company Form' | 'Referral' | 'Other' | null;
  keyRequirements?: string | null;
  techTags?: string[];
}

export interface JdResearch {
  companyWebsite?: string;
  summary?: string;
  marketSalaryHint?: string;
  sources?: { title: string; url: string }[];
  via?: 'serper' | 'gemini';
  unsupported?: boolean;
  error?: string;
}

export interface ParseJdResult {
  fields: ParsedJdFields;
  gaps: string[];
  usedLLM: boolean;
  fetched: boolean;
  research?: JdResearch | null;
}

export interface ParseJdParams {
  jdText?: string;
  jdUrl?: string;
  // Optional BYOK config — omit to run deterministic-only (no LLM).
  provider?: Provider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  enrich?: boolean; // opt-in web-search company research
  searchKey?: string; // serper.dev key — preferred search backend
}

// Parse a job description (text or URL) into structured fields via the
// deterministic-first LangGraph pipeline. Works with or without a key.
export async function parseJd(p: ParseJdParams): Promise<ParseJdResult> {
  const headers: Record<string, string> = p.provider && p.apiKey
    ? byokHeaders({ provider: p.provider, apiKey: p.apiKey, model: p.model, baseUrl: p.baseUrl })
    : {};
  if (p.searchKey) headers['X-Search-Key'] = p.searchKey;
  return postJson<ParseJdResult>('/api/jd/parse', { jdText: p.jdText, jdUrl: p.jdUrl, enrich: p.enrich }, headers);
}

export type Recommendation = 'skip' | 'stretch' | 'apply';

export interface ScoreResult {
  score: number;
  recommendation: Recommendation;
  matched: string[];
  missing: string[];
  strengths: string[];
  gaps: string[];
  rationale: string;
  usedLLM: boolean;
}

export interface ScoreMatchParams {
  masterMd: string;
  jdText: string;
  // Optional BYOK config — omit to run keyword-coverage only (no LLM).
  provider?: Provider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

// Score a master CV against a job description (Stage 3). Works with or without a key.
export async function scoreMatch(p: ScoreMatchParams): Promise<ScoreResult> {
  const headers: Record<string, string> = p.provider && p.apiKey
    ? byokHeaders({ provider: p.provider, apiKey: p.apiKey, model: p.model, baseUrl: p.baseUrl })
    : {};
  return postJson<ScoreResult>('/api/jd/score', { masterMd: p.masterMd, jdText: p.jdText }, headers);
}

export async function apiHealth(): Promise<{ ok: boolean }> {
  const res = await fetch('/api/health');
  return res.json();
}
