import { Handler } from '../../lib/server/types';
import { callLLM, LLMError } from '../../lib/server/llm';
import { requireMethod, getApiKey, getProvider, getModel, fail } from '../../lib/server/http';

// Tailor system prompt — the downstream counterpart to docs/prompts/master-cv.md.
// Selects ONE lane, matches exact JD phrasing, stays truthful, single-column.
const SYSTEM = `You are a resume tailoring engine. Given a candidate's MASTER CV
and a JOB DESCRIPTION, produce a tailored single-column resume in Markdown.

Rules:
- Truth only: use solely facts present in the master CV. Never invent metrics,
  titles, or experience. You may rephrase and reorder, not fabricate.
- Pick ONE positioning lane that best fits the JD; drop off-lane content.
- Match the JD's exact phrasing/keywords in bullets where the master supports it
  (reorder bullets so the most relevant lead). No keyword stuffing.
- Plain, ATS-friendly single column: # Name, contact line, Summary, Skills,
  Experience, Projects, Education. No tables, columns, or graphics.
- Return ONLY the resume Markdown — no commentary.`;

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
    const tailoredMd = await callLLM({ provider, apiKey, system: SYSTEM, prompt, model: getModel(req), maxTokens: 2500 });
    res.status(200).json({ tailoredMd, provider });
  } catch (e) {
    const err = e as LLMError;
    fail(res, err.status || 502, 'LLM request failed', err.message);
  }
};

export default handler;
