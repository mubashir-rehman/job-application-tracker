// Track 3 — visual-QA loop. Deterministic pre-checks first (free, no network):
// page count, ATS keyword coverage/linearization (atsCheck.ts), minimum font
// size. Then, if a BYOK vision-capable provider is configured, iterate up to
// `maxIterations` times: rasterize the current render → send pages + rules
// prompt to the model (POST /api/resume/visual-qa) → map the highest-priority
// reported issue to an overflow lever (skills/resume-render/tokens.json) →
// advance that lever → re-render → re-check. Degrades gracefully (deterministic
// checks only, with a notice) when the provider has no vision support or the
// vision call fails — never throws the caller into an error state.
import { generatePdf, RenderTokens, resumeTokens as defaultTokens } from './resumeRender';
import { rasterizePdf } from './pdfRaster';
import { runAtsCheck } from './atsCheck';
import { checkVisualQa, QaIssue } from './apiClient';
import { Provider } from './apiKeys';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface DeterministicCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface VisualQaIteration {
  iteration: number;
  issues: QaIssue[];
  leverApplied: string | null;
}

export interface VisualQaRunResult {
  deterministic: DeterministicCheck[];
  iterations: VisualQaIteration[];
  finalTokens: RenderTokens;
  finalPdf: Blob;
  degraded: boolean; // true = vision unsupported/unavailable — deterministic checks only
  notice?: string;
}

export interface VisualQaOptions {
  resumeMd: string;
  jdText: string;
  baseName?: string;
  tokens?: RenderTokens;
  rulesPrompt?: string; // default: DEFAULT_VISUAL_QA_RUBRIC (Prompt-Manager overridable, Track 4)
  provider: Provider;
  apiKey: string;
  model?: string;
  maxIterations?: number; // default 3
}

// The shipped default rules prompt — kept in sync with
// skills/resume-render/SKILL.md § "Visual QA rubric" (that file is the prose
// source of truth for humans; this constant is the code-usable copy Track 4's
// Prompt Manager offers as the default, overridable value).
export const DEFAULT_VISUAL_QA_RUBRIC = `You are a meticulous resume layout reviewer. You are given rasterized page images of a
single-column professional resume, in order (page 1 first). The intended house style is:
Calibri/Helvetica body, US Letter with 0.75in margins, single column, navy (#1F3864) UPPERCASE
section headers with a thin bottom rule, job headers with the role/company on the left and the
date range right-aligned to the margin, and concise bullet points with optional bold lead-in
labels. A strong resume fits on 1–2 pages with even, uncramped spacing.

Review the pages and flag layout defects. Check specifically for:
- Orphaned job/section heading stranded alone at the very bottom of a page (its content starts
  on the next page).
- Content overflowing onto a third page when it could reasonably fit on two.
- Cramped or uneven vertical spacing (bullets/lines too tight, or large inconsistent gaps).
- A widowed single bullet or single line left alone at the top or bottom of a page.
- Right-aligned dates that are misaligned, wrapping, or colliding with the role/company text.
- A section awkwardly split across a page break (e.g. header on one page, all bullets on next).
- Fonts or colors that do not match the house style (wrong section-header color, non-navy
  headers, inconsistent body font, headers not uppercased or missing the bottom rule).

For every defect found, choose the single most appropriate spacing lever to fix it, from this
ordered set (prefer earlier levers; use null if no spacing lever applies, e.g. a color/font
mismatch): "bulletAfter", "bulletLine", "sectionBefore", "jobBefore", "removeSpacers".

Respond with STRICT JSON only — an array, no prose, no markdown fence:
[{"issue": "<short description>", "severity": "high" | "medium" | "low", "lever": "<lever id>" | null, "note": "<why / which page>"}]

If the pages look clean, respond with []. Severity guide: high = spills to an extra page or an
orphaned/split heading; medium = cramped spacing or misaligned dates; low = minor cosmetic.`;

// The renderer's fixed body/bullet text size (see generatePdf in resumeRender.ts).
// Not currently token-driven — this check exists so a future token/lever change
// that DID make font size configurable would be caught by the same QA pass.
const RENDERED_BODY_PT = 11;
const MIN_READABLE_PT = 9;

function runDeterministicChecks(resumeMd: string, jdText: string, pageCount: number): DeterministicCheck[] {
  const checks: DeterministicCheck[] = [];

  checks.push({
    id: 'pageCount',
    label: 'Page count',
    status: pageCount <= 2 ? 'pass' : pageCount === 3 ? 'warn' : 'fail',
    detail: `${pageCount} page${pageCount === 1 ? '' : 's'} — a resume should fit in 1–2.`,
  });

  const ats = runAtsCheck(resumeMd, jdText);
  checks.push({
    id: 'atsCoverage',
    label: 'ATS keyword coverage & linearization',
    status: ats.score >= 80 ? 'pass' : ats.score >= 60 ? 'warn' : 'fail',
    detail: `ATS score ${ats.score}/100 (${ats.rating}).`,
  });

  checks.push({
    id: 'minFontSize',
    label: 'Minimum font size',
    status: RENDERED_BODY_PT >= MIN_READABLE_PT ? 'pass' : 'fail',
    detail: `Body text renders at ${RENDERED_BODY_PT}pt (minimum readable: ${MIN_READABLE_PT}pt).`,
  });

  return checks;
}

function cloneTokens(t: RenderTokens): RenderTokens {
  return JSON.parse(JSON.stringify(t));
}

// Advance a numeric spacing lever to its next step on a CLONE of `tokens`.
// Levers whose id has no matching `spacing.*` key (e.g. `removeSpacers`, which
// targets paragraph removal the current renderer doesn't emit) are not numeric
// and cannot be auto-applied here — `applied: false` signals "nothing more to try".
function applyLever(tokens: RenderTokens, leverId: string): { tokens: RenderTokens; applied: boolean } {
  const lever = tokens.overflowLevers.find((l) => l.id === leverId);
  const spacing = tokens.spacing as unknown as Record<string, number>;
  if (!lever || !(leverId in spacing)) return { tokens, applied: false };
  const steps = lever.steps as unknown[];
  const idx = steps.findIndex((s) => s === spacing[leverId]);
  const next = idx >= 0 ? steps[idx + 1] : undefined;
  if (typeof next !== 'number') return { tokens, applied: false };
  const mutated = cloneTokens(tokens);
  (mutated.spacing as unknown as Record<string, number>)[leverId] = next;
  return { tokens: mutated, applied: true };
}

export async function runVisualQa(opts: VisualQaOptions): Promise<VisualQaRunResult> {
  const maxIterations = opts.maxIterations ?? 3;
  const rulesPrompt = opts.rulesPrompt?.trim() || DEFAULT_VISUAL_QA_RUBRIC;
  let tokens = cloneTokens(opts.tokens ?? defaultTokens);

  let pdf = await generatePdf(opts.resumeMd, opts.baseName, tokens);
  let pages = await rasterizePdf(pdf, { maxPages: 4 });
  const deterministic = runDeterministicChecks(opts.resumeMd, opts.jdText, pages.length);

  const iterations: VisualQaIteration[] = [];
  let degraded = false;
  let notice: string | undefined;

  for (let i = 0; i < maxIterations; i++) {
    let result: Awaited<ReturnType<typeof checkVisualQa>>;
    try {
      result = await checkVisualQa({ provider: opts.provider, apiKey: opts.apiKey, images: pages, rulesPrompt, model: opts.model });
    } catch (e) {
      degraded = true;
      notice = e instanceof Error ? e.message : 'Visual QA request failed — showing deterministic checks only.';
      break;
    }
    if (!result.supported) {
      degraded = true;
      notice = 'The selected provider/model has no vision support — showing deterministic checks only.';
      break;
    }
    if (result.error) notice = result.error;

    const actionable = result.issues.find((x) => x.lever);
    iterations.push({ iteration: i + 1, issues: result.issues, leverApplied: actionable?.lever ?? null });

    if (!result.issues.length) break; // clean pass
    if (!actionable) break;           // issues exist but none map to a fixable lever

    const { tokens: mutated, applied } = applyLever(tokens, actionable.lever!);
    if (!applied) break; // lever exhausted or non-numeric — nothing more to try automatically
    tokens = mutated;
    pdf = await generatePdf(opts.resumeMd, opts.baseName, tokens);
    pages = await rasterizePdf(pdf, { maxPages: 4 });
  }

  return { deterministic, iterations, finalTokens: tokens, finalPdf: pdf, degraded, notice };
}
