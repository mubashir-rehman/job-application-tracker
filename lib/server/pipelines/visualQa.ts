// Track 3 — visual-QA vision call. One round-trip per QA iteration: send the
// rasterized page images + the rules prompt (default from
// skills/resume-render/SKILL.md, user-overridable via Track 4's Prompt Manager)
// to the user's BYOK multimodal model, parse the strict-JSON issue list. The
// client (src/lib/visualQa.ts) owns the actual iterate/re-render loop and the
// lever→token mutation — this pipeline is a single stateless vision call.
import { Provider, callLLMVision, VISION_PROVIDERS, LLMError } from '../llm.js';

export type QaSeverity = 'high' | 'medium' | 'low';

export interface QaIssue {
  issue: string;
  severity: QaSeverity;
  lever: string | null;
  note?: string;
}

export interface VisualQaVisionInput {
  images: string[]; // JPEG data URLs, one per page (from src/lib/pdfRaster.ts)
  rulesPrompt: string;
  apiKey: string;
  provider: Provider;
  model?: string;
}

export interface VisualQaVisionOutput {
  issues: QaIssue[];
  supported: boolean; // false = provider has no vision dialect here — caller should degrade
  error?: string;
}

const SEVERITIES: QaSeverity[] = ['high', 'medium', 'low'];

// Best-effort strict-JSON ARRAY extraction (the QA rubric's contract is an array,
// not an object, so `safeJsonParse` — object-rooted — doesn't apply here).
function parseIssues(raw: string): QaIssue[] {
  const stripped = raw.replace(/```(?:json)?/gi, '').trim();
  const start = stripped.indexOf('[');
  const end = stripped.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  let arr: unknown;
  try { arr = JSON.parse(stripped.slice(start, end + 1)); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && typeof x.issue === 'string')
    .map((x) => ({
      issue: String(x.issue),
      severity: SEVERITIES.includes(x.severity as QaSeverity) ? (x.severity as QaSeverity) : 'low',
      lever: typeof x.lever === 'string' ? x.lever : null,
      note: typeof x.note === 'string' ? x.note : undefined,
    }));
}

export async function runVisualQaVision(input: VisualQaVisionInput): Promise<VisualQaVisionOutput> {
  if (!VISION_PROVIDERS.includes(input.provider)) return { issues: [], supported: false };
  if (!input.images.length) return { issues: [], supported: true };
  try {
    const raw = await callLLMVision({
      provider: input.provider,
      apiKey: input.apiKey,
      prompt: input.rulesPrompt,
      images: input.images,
      model: input.model,
      maxTokens: 1500,
    });
    return { issues: parseIssues(raw), supported: true };
  } catch (e) {
    return { issues: [], supported: true, error: (e as LLMError).message };
  }
}
