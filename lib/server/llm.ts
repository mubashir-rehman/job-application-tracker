// BYOK LLM client. Calls the user's chosen provider directly with their key
// (passed per-request, never stored or logged). Uses the provider REST APIs via
// fetch so there are no SDK dependencies — keeps the serverless bundle light.

export type Provider = 'anthropic' | 'openai' | 'gemini' | 'mimo' | 'custom';

// Conservative, widely-available defaults; override per request with X-Model.
// 'custom' has no default — base URL + model come from the request (BYOK).
const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-3-5-sonnet-latest',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-flash',
  // Xiaomi MiMo (OpenAI-compatible). Text flagship; other ids from /v1/models
  // include mimo-v2.5, mimo-v2-pro, mimo-v2-omni. Override per request via X-Model.
  mimo: 'mimo-v2.5-pro',
  custom: '',
};

// Base URLs for built-in OpenAI chat-completions-compatible providers.
const OPENAI_COMPATIBLE_BASE: Partial<Record<Provider, string>> = {
  openai: 'https://api.openai.com/v1',
  mimo: 'https://token-plan-sgp.xiaomimimo.com/v1',
};

export interface LLMOptions {
  provider: Provider;
  apiKey: string;
  prompt: string;
  system?: string;
  model?: string;
  maxTokens?: number;
  baseUrl?: string; // required for provider 'custom' (OpenAI-compatible endpoint)
}

export class LLMError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

// Thrown by callLLMWithSearch for providers that don't (yet) have web grounding.
export class SearchUnsupportedError extends LLMError {
  constructor(provider: string) {
    super(`Web search isn't supported for provider '${provider}' yet — use a Gemini key.`, 400);
  }
}

export interface SearchResult {
  text: string;
  sources: { title: string; url: string }[];
}

// Grounded LLM call (web search). Currently backed by Gemini's Google Search
// grounding; Anthropic/OpenAI web-search tools can slot in here later.
export async function callLLMWithSearch(opts: LLMOptions): Promise<SearchResult> {
  if (opts.provider === 'gemini') return geminiSearch(opts);
  throw new SearchUnsupportedError(opts.provider);
}

async function geminiSearch({ apiKey, prompt, system, model, maxTokens }: LLMOptions): Promise<SearchResult> {
  const m = model || DEFAULT_MODEL.gemini;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        // Disable "thinking" (2.5-flash) so the token budget goes to the grounded
        // answer, not reasoning — otherwise a small budget truncates to empty.
        generationConfig: { maxOutputTokens: maxTokens ?? 1500, thinkingConfig: { thinkingBudget: 0 } },
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Gemini search error ${res.status}`, res.status);
  const cand = data?.candidates?.[0];
  const text = cand?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') ?? '';
  const chunks = cand?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks
    .map((c: any) => ({ title: c?.web?.title || '', url: c?.web?.uri || '' }))
    .filter((s: { url: string }) => s.url);
  return { text, sources };
}

export async function callLLM(opts: LLMOptions): Promise<string> {
  const { provider } = opts;
  if (provider === 'anthropic') return callAnthropic(opts);
  if (provider === 'gemini') return callGemini(opts);
  if (provider === 'custom') {
    const base = opts.baseUrl?.trim().replace(/\/+$/, '');
    if (!base) throw new LLMError('Custom provider requires a base URL', 400);
    if (!opts.model) throw new LLMError('Custom provider requires a model', 400);
    return callOpenAICompatible(opts, base, opts.model);
  }
  const base = OPENAI_COMPATIBLE_BASE[provider];
  if (base) return callOpenAICompatible(opts, base, DEFAULT_MODEL[provider]);
  throw new LLMError(`Unknown provider: ${provider}`, 400);
}

async function callAnthropic({ apiKey, prompt, system, model, maxTokens }: LLMOptions): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL.anthropic,
      max_tokens: maxTokens ?? 2000,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Anthropic error ${res.status}`, res.status);
  return data?.content?.[0]?.text ?? '';
}

// Shared by OpenAI and any OpenAI-chat-completions-compatible provider (MiMo).
async function callOpenAICompatible(
  { apiKey, prompt, system, model, maxTokens }: LLMOptions,
  baseUrl: string,
  defaultModel: string,
): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || defaultModel,
      max_tokens: maxTokens ?? 2000,
      messages,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `LLM error ${res.status}`, res.status);
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callGemini({ apiKey, prompt, system, model, maxTokens }: LLMOptions): Promise<string> {
  const m = model || DEFAULT_MODEL.gemini;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens ?? 2000 },
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Gemini error ${res.status}`, res.status);
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
}
