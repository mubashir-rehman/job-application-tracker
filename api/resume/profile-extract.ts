import { Handler } from '../../lib/server/types.js';
import { LLMError } from '../../lib/server/llm.js';
import { runProfileExtract } from '../../lib/server/pipelines/profileExtract.js';
import { requireMethod, getApiKey, getProvider, getModel, getBaseUrl, fail } from '../../lib/server/http.js';

// Vercel: a single small structured-output call fits well under the Hobby cap.
export const maxDuration = 60;

// POST /api/resume/profile-extract
// headers: X-API-Key (required), X-Provider, X-Model?, X-Base-URL?
// body: { masterMd: string }
const handler: Handler = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const apiKey = getApiKey(req);
  if (!apiKey) return fail(res, 400, 'Missing X-API-Key header (BYOK)');

  const { masterMd } = req.body || {};
  if (!masterMd || typeof masterMd !== 'string') return fail(res, 400, 'masterMd is required');

  try {
    const profile = await runProfileExtract({
      masterMd,
      apiKey,
      provider: getProvider(req),
      model: getModel(req),
      baseUrl: getBaseUrl(req),
    });
    res.status(200).json(profile);
  } catch (e) {
    const err = e as LLMError;
    fail(res, err.status || 502, 'Profile extraction failed', err.message);
  }
};

export default handler;
