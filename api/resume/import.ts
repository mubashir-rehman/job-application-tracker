import { Handler } from '../../lib/server/types';
import { callLLM, LLMError } from '../../lib/server/llm';
import { requireMethod, getApiKey, getProvider, getModel, getBaseUrl, fail } from '../../lib/server/http';

// Import-conversion prompt: turn messy extracted resume text (PDF/docx text
// dump) into clean, well-structured Markdown WITHOUT changing the content.
const SYSTEM = `You convert raw extracted resume text into clean Markdown.

Rules:
- Preserve ALL content exactly: every role, date, bullet, skill, number, link.
  Never invent, summarize away, or drop anything. This is reformatting, not editing.
- Fix artifacts from text extraction: merge words split across lines, repair
  broken bullets, remove stray page numbers / headers / footers, fix spacing.
- Structure as a standard single-column resume: # Name on the first line, a
  contact line beneath it (email · phone · location · links), then ## sections
  (Summary, Experience, Projects, Skills, Education, etc.) in the source order.
- Use **bold** for company/role titles, plain text for dates, and - bullets for
  responsibilities. No tables, columns, HTML, or graphics (keep it ATS-safe).
- Return ONLY the resume Markdown — no commentary, no code fences.`;

// POST /api/resume/import
// headers: X-API-Key (required), X-Provider (anthropic|openai|gemini), X-Model?
// body: { rawText: string, sourceFormat?: string }
const handler: Handler = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const apiKey = getApiKey(req);
  if (!apiKey) return fail(res, 400, 'Missing X-API-Key header (BYOK)');

  const { rawText, sourceFormat } = req.body || {};
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return fail(res, 400, 'rawText is required');
  }

  const provider = getProvider(req);
  const prompt = [
    sourceFormat ? `SOURCE FORMAT: ${sourceFormat}` : '',
    `\n--- RAW EXTRACTED RESUME TEXT ---\n${rawText}`,
    `\nReturn the cleaned resume as Markdown now.`,
  ].filter(Boolean).join('\n');

  try {
    const markdown = await callLLM({ provider, apiKey, system: SYSTEM, prompt, model: getModel(req), baseUrl: getBaseUrl(req), maxTokens: 3000 });
    res.status(200).json({ markdown, provider });
  } catch (e) {
    const err = e as LLMError;
    fail(res, err.status || 502, 'LLM request failed', err.message);
  }
};

export default handler;
