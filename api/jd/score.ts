import { Handler } from '../_lib/types';
import { LLMError } from '../_lib/llm';
import { runScore } from '../_lib/pipelines/score';
import { requireMethod, getApiKey, getProvider, getModel, getBaseUrl, fail } from '../_lib/http';

// Vercel: an LLM verdict fits well under the Hobby cap. Ignored by the dev server.
export const maxDuration = 60;

// POST /api/jd/score
// headers (optional — no key ⇒ keyword coverage only): X-API-Key, X-Provider, X-Model, X-Base-URL
// body: { masterMd: string, jdText: string }
const handler: Handler = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const { masterMd, jdText } = req.body || {};
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
    });
    res.status(200).json(result);
  } catch (e) {
    const err = e as LLMError;
    fail(res, err.status || 502, 'Match score failed', err.message);
  }
};

export default handler;
