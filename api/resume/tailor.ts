import { Handler } from '../../lib/server/types.js';
import { callLLM, LLMError } from '../../lib/server/llm.js';
import { requireMethod, getApiKey, getProvider, getModel, getBaseUrl, fail } from '../../lib/server/http.js';

// Vercel: reasoning-enabled tailoring can take longer than a plain completion.
export const maxDuration = 60;

// Tailor system prompt — the downstream counterpart to docs/prompts/master-cv.md.
// The ROLE + explicit reasoning steps + anti-mistake rules are distilled from real
// failures in the user's 17 ChatGPT resume chats (see memory: resume-analysis):
// overclaiming unsupported stacks, spray-and-pray positioning, foregrounding
// undefendable tech, bolding-as-tailoring, page-padding, project-name-heavy bullets,
// and skipping honesty notes. This call runs with reasoning ENABLED.
const SYSTEM = `You are a principal technical recruiter and resume strategist. You have screened
thousands of backend, AI, and software-engineering resumes through both ATS systems and live
hiring panels, and you have sat on the other side of interviews where candidates could not defend
what their resume claimed. You tailor resumes the way a careful hiring manager wishes candidates
would: truthfully, sharply positioned, and easy to verify.

Given a candidate's MASTER CV and a JOB DESCRIPTION, produce a tailored single-column resume.

REASON FIRST (think step by step before writing):
1. Extract the JD's true priorities: must-haves vs nice-to-haves, the exact keyword phrasing it
   uses (e.g. "RESTful APIs" vs "REST"), seniority, and the core problem the role solves.
2. Map each priority to the STRONGEST DEFENSIBLE evidence in the master CV — experience the
   candidate could defend in a 10-minute technical conversation.
3. Choose exactly ONE positioning lane that best fits the JD. Commit to it.
4. Decide what to lead with, what to keep, and what to drop.

HARD RULES (these are the mistakes to avoid):
- TRUTH ONLY. Use solely facts in the master CV. NEVER invent or inflate metrics, titles, years
  of experience, or tech stacks. Never claim production experience the master does not support
  (no fabricated Node.js/TypeScript, ERPNext SSO, fintech/compliance/HIPAA ownership, etc.).
  Rephrase and reorder — never fabricate.
- ONE LANE. No spray-and-pray. Do not hedge across Junior/Senior/Lead or unrelated stacks.
- DEFENSIBILITY FILTER. Foreground only what the candidate can defend live. Drop or de-emphasize
  weak or non-target tech even if it is in the master CV (e.g. a stack they bombed an interview on).
- REAL TAILORING ≠ BOLDING. Mirror the JD's exact phrasing inside bullets where the master
  supports it, and reorder bullets so the most JD-relevant evidence leads. No keyword stuffing,
  no bolding as a substitute for relevance.
- PROBLEM/SOLUTION/DOMAIN language. Rewrite internal-project-name-heavy bullets into what problem
  was solved, how, and in what domain — not a parade of codenames.
- CONCISION OVER PADDING. Do not stretch content to fill a page. White space is fine. A tight,
  relevant resume beats a padded one.
- CONTACT DETAILS: include only what the master CV provides. NEVER invent an email, phone,
  handle, or URL — omit what is missing rather than inserting a placeholder.
- ATS-SAFE SINGLE COLUMN. Standard headings only: # Name, a contact line, Summary, Skills,
  Experience, Projects, Education. No tables, columns, graphics, or text boxes.

OUTPUT (Markdown, in this exact order):
1. The tailored resume.
2. "---" then "## Tailoring Inventory" — bullets: what you reordered, rephrased to match JD
   wording, emphasized, and dropped, each with a one-line reason.
3. "## Honesty & Verification Notes" — any claim the candidate should verify before sending, any
   JD requirement NOT met (stated plainly, not hidden), and gaps the candidate is not claiming.
Return ONLY this Markdown — no preamble.`;

// POST /api/resume/tailor
// headers: X-API-Key (required), X-Provider (anthropic|openai|gemini), X-Model?
// body: { masterMd: string, jdText: string, lane?: string }
const handler: Handler = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const apiKey = getApiKey(req);
  if (!apiKey) return fail(res, 400, 'Missing X-API-Key header (BYOK)');

  const { masterMd, jdText, lane } = req.body || {};
  if (!masterMd || !jdText) return fail(res, 400, 'masterMd and jdText are required');

  const provider = getProvider(req);
  const prompt = [
    `TARGET LANE: ${lane || '(infer the single best-fitting lane from the JD)'}`,
    `\n--- MASTER CV ---\n${masterMd}`,
    `\n--- JOB DESCRIPTION ---\n${jdText}`,
    `\nProduce the tailored resume Markdown now.`,
  ].join('\n');

  try {
    // Reasoning ON — tailoring is a hard judgement task (positioning, defensibility,
    // exact-keyword mapping). Generous budget so reasoning + resume + the two
    // appended sections all fit (reasoning models would otherwise truncate).
    const tailoredMd = await callLLM({ provider, apiKey, system: SYSTEM, prompt, model: getModel(req), baseUrl: getBaseUrl(req), maxTokens: 8192, thinking: true });
    res.status(200).json({ tailoredMd, provider });
  } catch (e) {
    const err = e as LLMError;
    fail(res, err.status || 502, 'LLM request failed', err.message);
  }
};

export default handler;
