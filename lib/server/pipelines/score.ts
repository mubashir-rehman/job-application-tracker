// Stage 3 — match & positioning score. Deterministic-first like the JD parse
// pipeline: keyword coverage (master CV vs JD) is computed key-less; an LLM
// positioning verdict (skip/stretch/apply) refines it only when a key is present.
import { Provider, callLLM } from '../llm.js';
import { deterministicExtract } from '../jdExtract.js';

export type Recommendation = 'skip' | 'stretch' | 'apply';

export interface ScoreResult {
  score: number;            // 0–100 overall fit
  recommendation: Recommendation;
  matched: string[];        // JD tech tags present in the master CV
  missing: string[];        // JD tech tags absent from the master CV
  strengths: string[];      // defensible selling points (LLM)
  gaps: string[];           // weak/missing vs the JD (LLM, else derived)
  rationale: string;        // 1–2 sentence verdict
  usedLLM: boolean;
}

export interface ScoreInput {
  masterMd: string;
  jdText: string;
  apiKey?: string;
  provider?: Provider;
  model?: string;
  baseUrl?: string;
}

const SYSTEM = `You are a job-fit positioning analyst. Given a candidate MASTER CV and a JOB DESCRIPTION,
judge how well the candidate fits and whether to apply.

Truth only — judge solely from facts in the master CV. Never assume unstated skills.
Be honest about mismatch: flag seniority stretch (e.g. JD wants Lead/5+ yrs, CV shows less)
and non-target or weak stacks (skills barely present in the CV). Favour defensibility —
a strength must be something the candidate could defend in a 10-minute conversation.

Return ONLY this JSON (no prose, no code fences):
{"score": <0-100 int>, "recommendation": "skip"|"stretch"|"apply",
 "strengths": [<=5 short phrases], "gaps": [<=5 short phrases], "rationale": "<1-2 sentences>"}

recommendation: "apply" = strong fit; "stretch" = partial fit worth a tailored shot; "skip" = poor fit / wasted effort.`;

function safeJson(raw: string): Record<string, any> | null {
  const stripped = raw.replace(/```(?:json)?/gi, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(stripped.slice(start, end + 1)); } catch { return null; }
}

// Deterministic keyword coverage: which JD tech tags appear in the master CV.
function coverage(masterMd: string, jdText: string): { matched: string[]; missing: string[]; ratio: number } {
  const tags = deterministicExtract(jdText).fields.techTags || [];
  if (!tags.length) return { matched: [], missing: [], ratio: 0 };
  const hay = masterMd.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];
  for (const t of tags) (hay.includes(t.toLowerCase()) ? matched : missing).push(t);
  return { matched, missing, ratio: matched.length / tags.length };
}

function recFromRatio(ratio: number): Recommendation {
  if (ratio >= 0.6) return 'apply';
  if (ratio >= 0.3) return 'stretch';
  return 'skip';
}

export async function runScore(input: ScoreInput): Promise<ScoreResult> {
  const { masterMd, jdText } = input;
  if (!masterMd?.trim() || !jdText?.trim()) throw new Error('masterMd and jdText are required');

  const { matched, missing, ratio } = coverage(masterMd, jdText);

  // Key-less: coverage-only verdict.
  if (!input.apiKey) {
    return {
      score: Math.round(ratio * 100),
      recommendation: recFromRatio(ratio),
      matched,
      missing,
      strengths: matched,
      gaps: missing.map((m) => `${m} not found in your master CV`),
      rationale: 'Keyword coverage only — add an AI key for a positioning verdict (seniority stretch, defensibility).',
      usedLLM: false,
    };
  }

  // Key present: LLM positioning verdict, with deterministic coverage as ground truth.
  const prompt = [
    `Deterministic keyword coverage: ${matched.length}/${matched.length + missing.length} JD tech tags in the CV.`,
    `Matched: ${matched.join(', ') || '(none)'}`,
    `Missing: ${missing.join(', ') || '(none)'}`,
    `\n--- MASTER CV ---\n${masterMd.slice(0, 8000)}`,
    `\n--- JOB DESCRIPTION ---\n${jdText.slice(0, 6000)}`,
    `\nReturn the JSON verdict now.`,
  ].join('\n');

  const raw = await callLLM({
    provider: input.provider || 'anthropic',
    apiKey: input.apiKey,
    system: SYSTEM,
    prompt,
    model: input.model,
    baseUrl: input.baseUrl,
    // Generous budget: reasoning models (e.g. MiMo) spend tokens thinking before
    // the small JSON verdict; too low returns empty.
    maxTokens: 2000,
  });

  const p = safeJson(raw);
  if (!p) {
    // LLM returned unparseable output — fall back to the deterministic verdict.
    return {
      score: Math.round(ratio * 100),
      recommendation: recFromRatio(ratio),
      matched, missing,
      strengths: matched,
      gaps: missing.map((m) => `${m} not found in your master CV`),
      rationale: 'Could not parse the AI verdict — showing keyword coverage instead.',
      usedLLM: true,
    };
  }

  const rec: Recommendation = ['skip', 'stretch', 'apply'].includes(p.recommendation) ? p.recommendation : recFromRatio(ratio);
  const score = typeof p.score === 'number' ? Math.max(0, Math.min(100, Math.round(p.score))) : Math.round(ratio * 100);
  return {
    score,
    recommendation: rec,
    matched,
    missing,
    strengths: Array.isArray(p.strengths) ? p.strengths.slice(0, 5).map(String) : matched,
    gaps: Array.isArray(p.gaps) ? p.gaps.slice(0, 5).map(String) : missing,
    rationale: typeof p.rationale === 'string' ? p.rationale : '',
    usedLLM: true,
  };
}
