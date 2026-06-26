// Frontend client for the HireTrack API (local dev server / Vercel functions).
// BYOK keys travel only in the X-API-Key header, exactly as the backend expects.
import { Provider } from './apiKeys';

async function postJson<T>(path: string, body: unknown, headers: Record<string, string>): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) throw new Error(data.detail || data.error || `Request failed (${res.status})`);
  return data as T;
}

export interface TailorParams {
  provider: Provider;
  apiKey: string;
  masterMd: string;
  jdText: string;
  lane?: string;
}

// Tailor a master CV to a job description via POST /api/resume/tailor.
export async function tailorResume(p: TailorParams): Promise<string> {
  const { tailoredMd } = await postJson<{ tailoredMd: string }>(
    '/api/resume/tailor',
    { masterMd: p.masterMd, jdText: p.jdText, lane: p.lane },
    { 'X-API-Key': p.apiKey, 'X-Provider': p.provider },
  );
  return tailoredMd;
}

export async function apiHealth(): Promise<{ ok: boolean }> {
  const res = await fetch('/api/health');
  return res.json();
}
