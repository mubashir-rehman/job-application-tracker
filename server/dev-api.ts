// Local API dev server — runs the same handlers that deploy as Vercel
// serverless functions (api/**), so `/api/*` works in `npm run dev` without
// the Vercel CLI. Vite proxies /api here (see vite.config.ts).
//
//   npm run dev:api      # this server alone (port 3001)
//   npm run dev:all      # vite + this server together
import express from 'express';
import type { Request, Response } from 'express';
import { Handler } from '../lib/server/types';

import health from '../api/health';
import tailor from '../api/resume/tailor';
import importResume from '../api/resume/import';
import jdParse from '../api/jd/parse';
import jdScore from '../api/jd/score';

const app = express();
app.use(express.json({ limit: '2mb' }));

// Adapt a framework-agnostic handler to an Express route.
const mount = (h: Handler) => (req: Request, res: Response) => {
  Promise.resolve(h(req as any, res as any)).catch((err) => {
    console.error('[api] unhandled error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error' });
  });
};

// Route table — mirror this in api/** filenames for Vercel. Use `all` so each
// handler receives every method and does its own guarding (matches Vercel,
// where one function handles all methods for its path).
app.all('/api/health', mount(health));
app.all('/api/resume/tailor', mount(tailor));
app.all('/api/resume/import', mount(importResume));
app.all('/api/jd/parse', mount(jdParse));
app.all('/api/jd/score', mount(jdScore));

const port = Number(process.env.API_PORT) || 3001;
app.listen(port, () => {
  console.log(`\x1b[36m⚡ HireTrack API dev server\x1b[0m → http://localhost:${port}`);
  console.log('   GET  /api/health');
  console.log('   POST /api/resume/tailor');
  console.log('   POST /api/resume/import');
  console.log('   POST /api/jd/parse');
});
