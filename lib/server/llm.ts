// BYOK LLM client. Calls the user's chosen provider directly with their key
// (passed per-request, never stored or logged). Uses the provider REST APIs via
// fetch so there are no SDK dependencies — keeps the serverless bundle light.

export type Provider = 'anthropic' | 'openai' | 'gemini' | 'mimo' | 'custom';

// Conservative, widely-available defaults; override per request with X-Model.
// 'custom' has no default — base URL + model come from the request (BYOK).
export const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-3-5-sonnet-latest',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-flash',
  // Xiaomi MiMo (OpenAI-compatible). Text flagship; other ids from /v1/models
  // include mimo-v2.5, mimo-v2-pro, mimo-v2-omni. Override per request via X-Model.
  mimo: 'mimo-v2.5-pro',
  custom: '',
};

// Base URLs for built-in OpenAI chat-completions-compatible providers.
export const OPENAI_COMPATIBLE_BASE: Partial<Record<Provider, string>> = {
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
  // Opt INTO reasoning for hard generative tasks (e.g. resume tailoring). Default
  // off — most calls want the answer, not tokens spent thinking. `maxTokens` is the
  // budget for the ANSWER; when thinking is on the reasoning allowance is added on
  // top (see tokenBudget) so the answer never gets truncated by reasoning. Gemini
  // and Anthropic get an explicit bounded thinking budget; OpenAI-compatible/MiMo
  // reason in-band, so they just get the larger combined token budget.
  thinking?: boolean;
}

export class LLMError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export interface Source {
  title: string;
  url: string;
}

export interface SearchResult {
  text: string;
  sources: Source[];
  // grounded = the answer was produced with live web results (native tool or our
  // agent loop). false when we fell back to an ordinary ungrounded completion.
  grounded: boolean;
  // Which backend produced it — surfaced for the "how was this grounded" badge.
  via?: string; // 'anthropic-native' | 'openai-native' | 'gemini-grounding' | 'agent-loop' | 'ungrounded'
}

// Best-effort JSON extraction from a raw LLM completion: strips code fences and
// slices between the first `{` and last `}`. Shared last-resort fallback for every
// caller that asks a model for JSON — provider structured-output modes (see
// `callLLMStructured` below) are preferred; this is what they degrade to.
export function safeJsonParse(raw: string): Record<string, any> | null {
  const stripped = raw.replace(/```(?:json)?/gi, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(stripped.slice(start, end + 1)); } catch { return null; }
}

// Dedupe sources by URL, keeping the first (usually richer) title seen.
export function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of sources) {
    if (!s.url || seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out;
}

// Grounded LLM call using each provider's OWN server-side web search — Anthropic's
// web_search tool, OpenAI's Responses `web_search`, Gemini's google_search grounding.
// Providers without native search (mimo/custom) throw so the caller (groundedCall)
// can fall through to the agent loop. Provider errors also throw here.
export async function callLLMWithSearch(opts: LLMOptions): Promise<SearchResult> {
  if (opts.provider === 'gemini') return geminiSearch(opts);
  if (opts.provider === 'anthropic') return anthropicSearch(opts);
  if (opts.provider === 'openai') return openaiSearch(opts);
  throw new LLMError(`Native web search not available for provider '${opts.provider}'`, 400);
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
  const sources = dedupeSources(
    chunks.map((c: any) => ({ title: c?.web?.title || '', url: c?.web?.uri || '' })),
  );
  return { text, sources, grounded: true, via: 'gemini-grounding' };
}

// Anthropic runs web_search server-side (max_uses caps searches per turn) and
// returns the answer as text blocks with inline citations, plus web_search_tool_result
// blocks holding the raw results. Collect sources from both.
async function anthropicSearch({ apiKey, prompt, system, model, maxTokens }: LLMOptions): Promise<SearchResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL.anthropic,
      max_tokens: maxTokens ?? 1500,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Anthropic search error ${res.status}`, res.status);
  const blocks = Array.isArray(data?.content) ? data.content : [];
  const text = blocks.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('');
  const sources: Source[] = [];
  for (const b of blocks) {
    // web_search_tool_result → content[] of web_search_result items.
    if (b?.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content) if (r?.url) sources.push({ title: r.title || '', url: r.url });
    }
    // Inline citations attached to text blocks.
    if (b?.type === 'text' && Array.isArray(b.citations)) {
      for (const c of b.citations) if (c?.url) sources.push({ title: c.title || '', url: c.url });
    }
  }
  return { text, sources: dedupeSources(sources), grounded: true, via: 'anthropic-native' };
}

// OpenAI Responses API with the built-in web_search tool. The answer arrives as
// `message` items whose content holds output_text with url_citation annotations.
async function openaiSearch({ apiKey, prompt, system, model, maxTokens }: LLMOptions): Promise<SearchResult> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL.openai,
      input: prompt,
      ...(system ? { instructions: system } : {}),
      ...(maxTokens ? { max_output_tokens: maxTokens } : {}),
      tools: [{ type: 'web_search' }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `OpenAI search error ${res.status}`, res.status);
  const output = Array.isArray(data?.output) ? data.output : [];
  let text = '';
  const sources: Source[] = [];
  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const c of item.content) {
      if (typeof c?.text === 'string') text += c.text;
      for (const a of c?.annotations || []) {
        if (a?.type === 'url_citation' && a.url) sources.push({ title: a.title || '', url: a.url });
      }
    }
  }
  return { text, sources: dedupeSources(sources), grounded: true, via: 'openai-native' };
}

// Decouple the reasoning budget from the output budget. `maxTokens` is what the
// caller wants for the ANSWER; when thinking is on the reasoning allowance is added
// ON TOP, so the answer always has its full budget. Reasoning models otherwise spend
// the output budget thinking and truncate — e.g. a tailored resume cut off after the
// summary. Thinking off → think=0, total=out (non-reasoning calls are unchanged).
export function tokenBudget(maxTokens: number | undefined, thinking: boolean | undefined, def: number) {
  const out = maxTokens ?? def;
  const think = thinking ? Math.min(out, 4096) : 0;
  return { out, think, total: out + think };
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

async function callAnthropic({ apiKey, prompt, system, model, maxTokens, thinking }: LLMOptions): Promise<string> {
  const { out, think, total } = tokenBudget(maxTokens, thinking, 2000);
  // Anthropic's minimum thinking budget is 1024; below that, skip thinking and keep
  // max_tokens at the output budget. Otherwise max_tokens covers thinking + answer.
  const useThinking = think >= 1024;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL.anthropic,
      max_tokens: useThinking ? total : out,
      ...(system ? { system } : {}),
      ...(useThinking ? { thinking: { type: 'enabled', budget_tokens: think } } : {}),
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Anthropic error ${res.status}`, res.status);
  // With thinking on, content[] holds thinking blocks before the text block — pick the text.
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks.find((b: any) => b?.type === 'text')?.text ?? '';
}

// Shared by OpenAI and any OpenAI-chat-completions-compatible provider (MiMo).
async function callOpenAICompatible(
  { apiKey, prompt, system, model, maxTokens, thinking }: LLMOptions,
  baseUrl: string,
  defaultModel: string,
): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  // MiMo/OpenAI-compatible models reason in-band (no separate thinking knob), so the
  // reasoning eats max_tokens. Add the thinking allowance so the answer still fits.
  const { total } = tokenBudget(maxTokens, thinking, 2000);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || defaultModel,
      max_tokens: total,
      messages,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `LLM error ${res.status}`, res.status);
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callGemini({ apiKey, prompt, system, model, maxTokens, thinking }: LLMOptions): Promise<string> {
  const m = model || DEFAULT_MODEL.gemini;
  // Gemini counts thinking tokens against maxOutputTokens. Use a BOUNDED thinking
  // budget (not -1/dynamic, which can eat the whole budget and leave only a summary)
  // and size maxOutputTokens to cover thinking + answer. Off → think=0, total=out.
  const { think, total } = tokenBudget(maxTokens, thinking, 2000);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: total, thinkingConfig: { thinkingBudget: think } },
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Gemini error ${res.status}`, res.status);
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
}

// ── Structured outputs ────────────────────────────────────────────────────────
// Ask each provider for JSON via its own structured/tool-forced output mode instead
// of parsing free text — more reliable than the `safeJsonParse` string-slicing it
// replaces call-sites for. Providers without a structured mode (mimo/custom) — or
// any provider whose structured call throws — fall back to a plain `callLLM` +
// `safeJsonParse`, so callers always get either parsed JSON or null, never a throw.

// A minimal JSON-Schema subject, just enough for each provider's structured mode
// (object root, typed properties, required list).
export interface JsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

export interface StructuredOptions extends LLMOptions {
  schema: JsonSchema;
  schemaName?: string; // defaults to 'result'
}

export interface StructuredResult {
  data: Record<string, any> | null;
  usedStructured: boolean; // true = provider's native structured mode produced `data`
}

export async function callLLMStructured(opts: StructuredOptions): Promise<StructuredResult> {
  try {
    if (opts.provider === 'anthropic') return { data: await anthropicStructured(opts), usedStructured: true };
    if (opts.provider === 'gemini') return { data: await geminiStructured(opts), usedStructured: true };
    if (opts.provider === 'openai') return { data: await openaiStructured(opts), usedStructured: true };
  } catch {
    // Structured call failed (schema rejected, network error, provider quirk) —
    // fall through to a plain completion + best-effort JSON extraction below.
  }
  const raw = await callLLM(opts);
  return { data: safeJsonParse(raw), usedStructured: false };
}

// Anthropic: force a single tool call whose `input_schema` IS the schema — the
// `tool_use` block's `input` arrives already parsed, no string-slicing needed.
async function anthropicStructured({ apiKey, prompt, system, model, maxTokens, thinking, schema, schemaName }: StructuredOptions): Promise<Record<string, any> | null> {
  const name = schemaName || 'result';
  const { out, think, total } = tokenBudget(maxTokens, thinking, 2000);
  const useThinking = think >= 1024;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL.anthropic,
      max_tokens: useThinking ? total : out,
      ...(system ? { system } : {}),
      ...(useThinking ? { thinking: { type: 'enabled', budget_tokens: think } } : {}),
      messages: [{ role: 'user', content: prompt }],
      tools: [{ name, description: `Emit the ${name} JSON.`, input_schema: schema }],
      // Thinking + forced tool_choice are mutually exclusive on the Anthropic API;
      // let the model choose when reasoning, otherwise force the structured tool.
      ...(useThinking ? {} : { tool_choice: { type: 'tool', name } }),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Anthropic structured error ${res.status}`, res.status);
  const blocks = Array.isArray(data?.content) ? data.content : [];
  const toolUse = blocks.find((b: any) => b?.type === 'tool_use' && b.name === name);
  return toolUse?.input ?? null;
}

// OpenAI Chat Completions: `response_format: json_schema` with `strict: true`.
async function openaiStructured({ apiKey, prompt, system, model, maxTokens, thinking, schema, schemaName }: StructuredOptions): Promise<Record<string, any> | null> {
  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  const { total } = tokenBudget(maxTokens, thinking, 2000);
  const res = await fetch(`${OPENAI_COMPATIBLE_BASE.openai}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL.openai,
      max_tokens: total,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: { name: schemaName || 'result', strict: true, schema: { ...schema, additionalProperties: false } },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `OpenAI structured error ${res.status}`, res.status);
  const text = data?.choices?.[0]?.message?.content ?? '';
  return text ? JSON.parse(text) : null;
}

// Gemini: `responseSchema` + `responseMimeType: application/json` on generateContent.
// Gemini's `responseSchema` follows a subset of OpenAPI 3.0, NOT full JSON
// Schema: it has no `type: [...]` union syntax for nullability — that's
// expressed with a sibling `nullable: true` instead, and `enum` may not
// contain `null`. Callers author schemas in plain JSON Schema (`type:
// ["string","null"]`, `enum: [...,  null]`) for Anthropic/OpenAI; this walks
// the schema recursively and rewrites both forms into Gemini's dialect so
// nullable fields (e.g. most of JD_EXTRACT_SCHEMA) actually work here instead
// of silently throwing and falling back to plain-text + safeJsonParse.
function toGeminiSchema(schema: unknown): unknown {
  if (schema == null || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  const src = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  let nullable = false;
  for (const [k, v] of Object.entries(src)) {
    if (k === 'type' && Array.isArray(v)) {
      const types = v.filter((t) => t !== 'null');
      if (v.includes('null')) nullable = true;
      out.type = types.length === 1 ? types[0] : types;
    } else if (k === 'enum' && Array.isArray(v) && v.includes(null)) {
      out.enum = v.filter((e) => e !== null);
      nullable = true;
    } else if (k === 'properties' && v && typeof v === 'object') {
      const props: Record<string, unknown> = {};
      for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) props[pk] = toGeminiSchema(pv);
      out.properties = props;
    } else if (k === 'items') {
      out.items = toGeminiSchema(v);
    } else {
      out[k] = v;
    }
  }
  if (nullable) out.nullable = true;
  return out;
}

async function geminiStructured({ apiKey, prompt, system, model, maxTokens, thinking, schema }: StructuredOptions): Promise<Record<string, any> | null> {
  const m = model || DEFAULT_MODEL.gemini;
  const { think, total } = tokenBudget(maxTokens, thinking, 2000);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: total,
          thinkingConfig: { thinkingBudget: think },
          responseMimeType: 'application/json',
          responseSchema: toGeminiSchema(schema),
        },
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Gemini structured error ${res.status}`, res.status);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  return text ? JSON.parse(text) : null;
}

// ── Vision (Track 3 visual-QA loop) ────────────────────────────────────────────
// Send rasterized page images + a rules prompt to a multimodal model, one call per
// QA iteration. Each provider's own vision dialect: Anthropic base64 image blocks,
// OpenAI `image_url` content parts (accepts a data URL directly), Gemini
// `inlineData` parts. mimo/custom have no defined vision dialect here — callers
// should check provider support before calling (see `VISION_PROVIDERS`).

export const VISION_PROVIDERS: Provider[] = ['anthropic', 'openai', 'gemini'];

export interface VisionOptions {
  provider: Provider;
  apiKey: string;
  prompt: string;
  images: string[]; // data URLs, e.g. data:image/jpeg;base64,...
  model?: string;
  maxTokens?: number;
}

export async function callLLMVision(opts: VisionOptions): Promise<string> {
  if (opts.provider === 'anthropic') return anthropicVision(opts);
  if (opts.provider === 'openai') return openaiVision(opts);
  if (opts.provider === 'gemini') return geminiVision(opts);
  throw new LLMError(`Vision is not supported for provider '${opts.provider}'`, 400);
}

function splitDataUrl(dataUrl: string): { mime: string; base64: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!m) throw new LLMError('Expected a base64 data: URL image', 400);
  return { mime: m[1], base64: m[2] };
}

async function anthropicVision({ apiKey, prompt, images, model, maxTokens }: VisionOptions): Promise<string> {
  const content = images.map((d) => {
    const { mime, base64 } = splitDataUrl(d);
    return { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } };
  });
  content.push({ type: 'text', text: prompt } as any);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL.anthropic,
      max_tokens: maxTokens ?? 1500,
      messages: [{ role: 'user', content }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Anthropic vision error ${res.status}`, res.status);
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks.find((b: any) => b?.type === 'text')?.text ?? '';
}

async function openaiVision({ apiKey, prompt, images, model, maxTokens }: VisionOptions): Promise<string> {
  const content = [{ type: 'text', text: prompt }, ...images.map((d) => ({ type: 'image_url', image_url: { url: d } }))];
  const res = await fetch(`${OPENAI_COMPATIBLE_BASE.openai}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL.openai,
      max_tokens: maxTokens ?? 1500,
      messages: [{ role: 'user', content }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `OpenAI vision error ${res.status}`, res.status);
  return data?.choices?.[0]?.message?.content ?? '';
}

async function geminiVision({ apiKey, prompt, images, model, maxTokens }: VisionOptions): Promise<string> {
  const m = model || DEFAULT_MODEL.gemini;
  const parts = [
    { text: prompt },
    ...images.map((d) => {
      const { mime, base64 } = splitDataUrl(d);
      return { inlineData: { mimeType: mime, data: base64 } };
    }),
  ];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { maxOutputTokens: maxTokens ?? 1500 } }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Gemini vision error ${res.status}`, res.status);
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
}
