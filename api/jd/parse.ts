import { Handler } from '../../lib/server/types';
import { LLMError } from '../../lib/server/llm';
import { FetchTextError } from '../../lib/server/fetchText';
import { runJdParse } from '../../lib/server/pipelines/jdParse';
import { requireMethod, getApiKey, getProvider, getModel, getBaseUrl, getSearchKey, fail } from '../../lib/server/http';

// Vercel: allow up to 60s (Hobby cap). Deterministic-first means most requests
// finish in ms; an LLM gap-fill still fits easily. Ignored by the Express dev server.
export const maxDuration = 60;

// POST /api/jd/parse
// headers (all optional — no key ⇒ deterministic-only): X-API-Key, X-Provider, X-Model, X-Base-URL
// body: { jdText?: string, jdUrl?: string }
const handler: Handler = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const { jdText, jdUrl, enrich } = req.body || {};
  if ((!jdText || typeof jdText !== 'string') && (!jdUrl || typeof jdUrl !== 'string')) {
    return fail(res, 400, 'Provide jdText or jdUrl');
  }

  try {
    const result = await runJdParse({
      jdText: typeof jdText === 'string' ? jdText : undefined,
      jdUrl: typeof jdUrl === 'string' ? jdUrl : undefined,
      apiKey: getApiKey(req) || undefined, // optional — enables the LLM gap-fill node
      provider: getProvider(req),
      model: getModel(req),
      baseUrl: getBaseUrl(req),
      enrich: enrich === true,
      searchKey: getSearchKey(req),
    });
    res.status(200).json(result);
  } catch (e) {
    if (e instanceof FetchTextError) {
      return fail(res, 422, 'Could not open the link — paste the job description text instead', e.message);
    }
    const err = e as LLMError;
    fail(res, err.status || 502, 'JD parse failed', err.message);
  }
};

export default handler;
