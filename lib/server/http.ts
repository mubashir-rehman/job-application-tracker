import { ApiReq, ApiRes } from './types';
import { Provider } from './llm';

// Read a header case-insensitively, returning the first value.
function header(req: ApiReq, name: string): string | undefined {
  const v = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

// BYOK key from the X-API-Key request header (never persisted or logged).
export function getApiKey(req: ApiReq): string | null {
  return header(req, 'x-api-key')?.trim() || null;
}

const PROVIDERS: Provider[] = ['anthropic', 'openai', 'gemini', 'mimo'];

// Provider from X-Provider header or body.provider; defaults to anthropic.
export function getProvider(req: ApiReq): Provider {
  const p = (header(req, 'x-provider') || req.body?.provider || 'anthropic').toLowerCase();
  return (PROVIDERS as string[]).includes(p) ? (p as Provider) : 'anthropic';
}

export function getModel(req: ApiReq): string | undefined {
  return header(req, 'x-model') || req.body?.model || undefined;
}

export function fail(res: ApiRes, code: number, error: string, detail?: string): void {
  res.status(code).json(detail ? { error, detail } : { error });
}

// Guard a handler to a single method; returns false (and responds 405) if not.
export function requireMethod(req: ApiReq, res: ApiRes, method: string): boolean {
  if (req.method !== method) {
    res.setHeader('Allow', method);
    fail(res, 405, `Method not allowed — use ${method}`);
    return false;
  }
  return true;
}
