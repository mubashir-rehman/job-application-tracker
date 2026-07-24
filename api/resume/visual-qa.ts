import { Handler } from '../../lib/server/types.js';
import { runVisualQaVision } from '../../lib/server/pipelines/visualQa.js';
import { requireMethod, getApiKey, getProvider, getModel, fail } from '../../lib/server/http.js';

// Vercel: a single vision call fits well under the Hobby cap.
export const maxDuration = 60;

// POST /api/resume/visual-qa
// headers: X-API-Key (required), X-Provider, X-Model?
// body: { images: string[] (JPEG data URLs), rulesPrompt: string }
const handler: Handler = async (req, res) => {
  if (!requireMethod(req, res, 'POST')) return;

  const apiKey = getApiKey(req);
  if (!apiKey) return fail(res, 400, 'Missing X-API-Key header (BYOK)');

  const { images, rulesPrompt } = req.body || {};
  if (!Array.isArray(images) || !images.length) return fail(res, 400, 'images (non-empty array) is required');
  if (!rulesPrompt || typeof rulesPrompt !== 'string') return fail(res, 400, 'rulesPrompt is required');

  const result = await runVisualQaVision({
    images,
    rulesPrompt,
    apiKey,
    provider: getProvider(req),
    model: getModel(req),
  });
  res.status(200).json(result);
};

export default handler;
