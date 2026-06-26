import { Provider, loadApiKeys } from './apiKeys';
import { loadCustomEndpoint, normalizeBaseUrl } from './customEndpoint';

export interface ProviderCall {
  provider: Provider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

// Pick a usable BYOK provider for features that don't have their own selector
// (e.g. JD autofill). Returns the first configured built-in, else a fully
// configured custom endpoint, else null (callers can still run key-less paths).
const ORDER: Provider[] = ['anthropic', 'openai', 'gemini', 'mimo'];

// `prefer` moves a provider to the front — e.g. web-search research prefers a
// Gemini key (the only grounded provider so far).
export function resolveProviderConfig(prefer?: Provider): ProviderCall | null {
  const keys = loadApiKeys();
  const order = prefer ? [prefer, ...ORDER.filter((p) => p !== prefer)] : ORDER;
  for (const id of order) {
    if (keys[id]) return { provider: id, apiKey: keys[id]! };
  }
  if (keys.custom) {
    const c = loadCustomEndpoint();
    if (c.baseUrl.trim() && c.model.trim()) {
      return { provider: 'custom', apiKey: keys.custom, model: c.model.trim(), baseUrl: normalizeBaseUrl(c.baseUrl) };
    }
  }
  return null;
}
