import { Handler } from '../../lib/server/types.js';
import { LLMError } from '../../lib/server/llm.js';
import { runScore } from '../../lib/server/pipelines/score.js';
import { requireMethod, getApiKey, getProvider, getModel, getBaseUrl, fail } from '../../lib/server/http.js';

// Vercel: an LLM verdict fits well under the Hobby cap. Ignored by the dev server.
export const maxDuration = 60;

// POST /api/jd/score
// headers (optional — no key ⇒ keyword coverage only): X-API-Key, X-Provider, X-Model, X-Base-URL
// body: { masterMd: string, jdText: string, research?: JdResearch } — `research` is the
// brief already returned by /api/jd/parse's `enrich`, forwarded as background context.
const handler: Handler = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const { masterMd, jdText, research } = req.body || {};
  if (!masterMd || typeof masterMd !== 'string') return fail(res, 400, 'masterMd is required');
  if (!jdText || typeof jdText !== 'string') return fail(res, 400, 'jdText is required');

  try {
    const result = await runScore({
      masterMd,
      jdText,
      apiKey: getApiKey(req) || undefined, // optional — enables the positioning verdict
      provider: getProvider(req),
      model: getModel(req),
      baseUrl: getBaseUrl(req),
      research: research || null,
    });
    res.status(200).json(result);
  } catch (e) {
    const err = e as LLMError;
    fail(res, err.status || 502, 'Match score failed', err.message);
  }
};

export default handler;
