import { Handler } from '../lib/server/types.js';
import { requireMethod, getApiKey } from '../lib/server/http.js';

// GET /api/health — liveness + whether a BYOK key was supplied on this request.
// Never echoes the key itself.
const handler: Handler = (req, res) => {
  if (!requireMethod(req, res, 'GET')) return;
  res.status(200).json({
    ok: true,
    service: 'hiretrack-api',
    keyProvided: !!getApiKey(req),
    ts: new Date().toISOString(),
  });
};

export default handler;
