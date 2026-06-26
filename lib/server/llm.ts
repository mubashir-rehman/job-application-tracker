// BYOK LLM client. Calls the user's chosen provider directly with their key
// (passed per-request, never stored or logged). Uses the provider REST APIs via
// fetch so there are no SDK dependencies — keeps the serverless bundle light.

export type Provider = 'anthropic' | 'openai' | 'gemini' | 'mimo';

// Conservative, widely-available defaults; override per request with X-Model.
const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-3-5-sonnet-latest',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-flash',
  // Xiaomi MiMo (OpenAI-compatible). Text flagship; other ids from /v1/models
  // include mimo-v2.5, mimo-v2-pro, mimo-v2-omni. Override per request via X-Model.
  mimo: 'mimo-v2.5-pro',
};

// Base URLs for OpenAI chat-completions-compatible providers.
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
}

export class LLMError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export async function callLLM(opts: LLMOptions): Promise<string> {
  const { provider } = opts;
  if (provider === 'anthropic') return callAnthropic(opts);
  if (provider === 'gemini') return callGemini(opts);
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
