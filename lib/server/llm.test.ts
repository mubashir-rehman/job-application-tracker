import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLM, callLLMWithSearch, callLLMStructured, safeJsonParse, LLMError, JsonSchema } from './llm.js';

// --- helpers -------------------------------------------------------------

// Minimal Response stand-in matching what the client reads (ok/status/json).
function jsonResponse(data: any, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

// Install a fetch mock that returns `data` and records the single call.
function stubFetchOnce(data: any, status = 200) {
  const fn = vi.fn(async () => jsonResponse(data, status));
  vi.stubGlobal('fetch', fn);
  return fn;
}

// Parse the JSON body of the Nth fetch call (0-indexed).
function bodyOf(fn: any, n = 0) {
  return JSON.parse(fn.mock.calls[n][1].body);
}
function initOf(fn: any, n = 0) {
  return fn.mock.calls[n][1];
}
function urlOf(fn: any, n = 0) {
  return fn.mock.calls[n][0] as string;
}

afterEach(() => vi.unstubAllGlobals());

// --- callLLM request shapes (thinking-budget math) -----------------------

describe('callLLM request shapes', () => {
  it('anthropic: thinking off → max_tokens is the output budget, no thinking block', async () => {
    const fn = stubFetchOnce({ content: [{ type: 'text', text: 'hi' }] });
    await callLLM({ provider: 'anthropic', apiKey: 'sk-ant', prompt: 'p', maxTokens: 1500 });
    const body = bodyOf(fn);
    expect(urlOf(fn)).toBe('https://api.anthropic.com/v1/messages');
    expect(initOf(fn).headers['x-api-key']).toBe('sk-ant');
    expect(initOf(fn).headers['anthropic-version']).toBe('2023-06-01');
    expect(body.max_tokens).toBe(1500);
    expect(body.thinking).toBeUndefined();
  });

  it('anthropic: thinking on adds the reasoning budget on top of the answer budget', async () => {
    const fn = stubFetchOnce({ content: [{ type: 'text', text: 'hi' }] });
    await callLLM({ provider: 'anthropic', apiKey: 'k', prompt: 'p', maxTokens: 3000, thinking: true });
    const body = bodyOf(fn);
    // out=3000, think=min(3000,4096)=3000 (>=1024) → total=6000
    expect(body.max_tokens).toBe(6000);
    expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 3000 });
  });

  it('anthropic: thinking budget below 1024 is dropped', async () => {
    const fn = stubFetchOnce({ content: [{ type: 'text', text: 'hi' }] });
    await callLLM({ provider: 'anthropic', apiKey: 'k', prompt: 'p', maxTokens: 800, thinking: true });
    const body = bodyOf(fn);
    // think=min(800,4096)=800 < 1024 → no thinking, max_tokens stays at out
    expect(body.max_tokens).toBe(800);
    expect(body.thinking).toBeUndefined();
  });

  it('openai: Bearer auth, max_tokens = out + thinking (in-band reasoning)', async () => {
    const fn = stubFetchOnce({ choices: [{ message: { content: 'ok' } }] });
    await callLLM({ provider: 'openai', apiKey: 'sk-oai', prompt: 'p', maxTokens: 2000, thinking: true });
    expect(urlOf(fn)).toBe('https://api.openai.com/v1/chat/completions');
    expect(initOf(fn).headers.authorization).toBe('Bearer sk-oai');
    // total = 2000 + min(2000,4096) = 4000
    expect(bodyOf(fn).max_tokens).toBe(4000);
  });

  it('mimo: routes to the Xiaomi base URL', async () => {
    const fn = stubFetchOnce({ choices: [{ message: { content: 'ok' } }] });
    await callLLM({ provider: 'mimo', apiKey: 'k', prompt: 'p' });
    expect(urlOf(fn)).toBe('https://token-plan-sgp.xiaomimimo.com/v1/chat/completions');
    expect(bodyOf(fn).max_tokens).toBe(2000); // default out, thinking off
  });

  it('gemini: bounded thinking budget, key in the URL', async () => {
    const fn = stubFetchOnce({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] });
    await callLLM({ provider: 'gemini', apiKey: 'g-key', prompt: 'p', maxTokens: 2000, thinking: true });
    expect(urlOf(fn)).toContain('key=g-key');
    const gc = bodyOf(fn).generationConfig;
    expect(gc.maxOutputTokens).toBe(4000); // total
    expect(gc.thinkingConfig.thinkingBudget).toBe(2000); // think
  });

  it('custom without a base URL throws a 400', async () => {
    await expect(callLLM({ provider: 'custom', apiKey: 'k', prompt: 'p', model: 'm' })).rejects.toMatchObject({ status: 400 });
  });
});

// --- callLLMWithSearch request shapes + response parsing -----------------

describe('callLLMWithSearch — gemini grounding', () => {
  it('sends google_search tool with thinking disabled and parses grounding chunks', async () => {
    const fn = stubFetchOnce({
      candidates: [{
        content: { parts: [{ text: 'Acme makes rockets.' }] },
        groundingMetadata: { groundingChunks: [{ web: { title: 'Acme', uri: 'https://acme.com' } }] },
      }],
    });
    const r = await callLLMWithSearch({ provider: 'gemini', apiKey: 'g', prompt: 'p' });
    const body = bodyOf(fn);
    expect(body.tools).toEqual([{ google_search: {} }]);
    expect(body.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
    expect(r).toEqual({
      text: 'Acme makes rockets.',
      sources: [{ title: 'Acme', url: 'https://acme.com' }],
      grounded: true,
      via: 'gemini-grounding',
    });
  });
});

describe('callLLMWithSearch — anthropic native', () => {
  it('sends the web_search_20250305 server tool and parses text + citations', async () => {
    const fn = stubFetchOnce({
      content: [
        { type: 'web_search_tool_result', content: [{ type: 'web_search_result', title: 'R1', url: 'https://r1.com' }] },
        { type: 'text', text: 'Answer.', citations: [{ type: 'web_search_result_location', title: 'R1', url: 'https://r1.com' }, { title: 'R2', url: 'https://r2.com' }] },
      ],
    });
    const r = await callLLMWithSearch({ provider: 'anthropic', apiKey: 'sk', prompt: 'p' });
    const body = bodyOf(fn);
    expect(body.tools).toEqual([{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }]);
    expect(initOf(fn).headers['x-api-key']).toBe('sk');
    expect(r.text).toBe('Answer.');
    expect(r.grounded).toBe(true);
    expect(r.via).toBe('anthropic-native');
    // r1 appears in both the tool_result and a citation → deduped once.
    expect(r.sources).toEqual([{ title: 'R1', url: 'https://r1.com' }, { title: 'R2', url: 'https://r2.com' }]);
  });
});

describe('callLLMWithSearch — openai native', () => {
  it('uses the Responses API web_search tool and parses url_citation annotations', async () => {
    const fn = stubFetchOnce({
      output: [
        { type: 'web_search_call' },
        { type: 'message', content: [{ type: 'output_text', text: 'Result.', annotations: [{ type: 'url_citation', title: 'Src', url: 'https://src.com' }] }] },
      ],
    });
    const r = await callLLMWithSearch({ provider: 'openai', apiKey: 'sk-oai', prompt: 'p', system: 'sys', maxTokens: 700 });
    const body = bodyOf(fn);
    expect(urlOf(fn)).toBe('https://api.openai.com/v1/responses');
    expect(initOf(fn).headers.authorization).toBe('Bearer sk-oai');
    expect(body.tools).toEqual([{ type: 'web_search' }]);
    expect(body.instructions).toBe('sys');
    expect(body.max_output_tokens).toBe(700);
    expect(r).toEqual({
      text: 'Result.',
      sources: [{ title: 'Src', url: 'https://src.com' }],
      grounded: true,
      via: 'openai-native',
    });
  });
});

describe('callLLMWithSearch — unsupported providers', () => {
  it('throws for mimo (no native search)', async () => {
    stubFetchOnce({});
    await expect(callLLMWithSearch({ provider: 'mimo', apiKey: 'k', prompt: 'p' })).rejects.toBeInstanceOf(LLMError);
  });
});

describe('callLLMWithSearch — provider errors surface', () => {
  it('propagates an HTTP error from gemini', async () => {
    stubFetchOnce({ error: { message: 'quota' } }, 429);
    await expect(callLLMWithSearch({ provider: 'gemini', apiKey: 'g', prompt: 'p' })).rejects.toMatchObject({ status: 429 });
  });
});

// --- safeJsonParse ---------------------------------------------------------

describe('safeJsonParse', () => {
  it('extracts JSON from a fenced code block', () => {
    expect(safeJsonParse('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('extracts JSON surrounded by prose', () => {
    expect(safeJsonParse('Sure, here you go: {"a":1} — hope that helps')).toEqual({ a: 1 });
  });
  it('returns null for unparseable input', () => {
    expect(safeJsonParse('no json here')).toBeNull();
    expect(safeJsonParse('{not valid')).toBeNull();
  });
});

// --- callLLMStructured — provider structured-output modes -----------------

const SCHEMA: JsonSchema = {
  type: 'object',
  properties: { foo: { type: 'string' } },
  required: ['foo'],
  additionalProperties: false,
};

describe('callLLMStructured — anthropic (tool-forcing)', () => {
  it('forces a tool call and reads the already-parsed input', async () => {
    const fn = stubFetchOnce({ content: [{ type: 'tool_use', name: 'result', input: { foo: 'bar' } }] });
    const r = await callLLMStructured({ provider: 'anthropic', apiKey: 'k', prompt: 'p', schema: SCHEMA });
    const body = bodyOf(fn);
    expect(body.tools).toEqual([{ name: 'result', description: 'Emit the result JSON.', input_schema: SCHEMA }]);
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'result' });
    expect(r).toEqual({ data: { foo: 'bar' }, usedStructured: true });
  });

  it('does not force tool_choice when thinking is enabled (mutually exclusive)', async () => {
    const fn = stubFetchOnce({ content: [{ type: 'tool_use', name: 'result', input: { foo: 'bar' } }] });
    await callLLMStructured({ provider: 'anthropic', apiKey: 'k', prompt: 'p', schema: SCHEMA, thinking: true, maxTokens: 2000 });
    expect(bodyOf(fn).tool_choice).toBeUndefined();
    expect(bodyOf(fn).thinking).toBeDefined();
  });
});

describe('callLLMStructured — openai (response_format json_schema)', () => {
  it('sends a strict json_schema response_format and parses the content', async () => {
    const fn = stubFetchOnce({ choices: [{ message: { content: '{"foo":"bar"}' } }] });
    const r = await callLLMStructured({ provider: 'openai', apiKey: 'k', prompt: 'p', schema: SCHEMA, schemaName: 'my_schema' });
    const body = bodyOf(fn);
    expect(urlOf(fn)).toBe('https://api.openai.com/v1/chat/completions');
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'my_schema', strict: true, schema: { ...SCHEMA, additionalProperties: false } },
    });
    expect(r).toEqual({ data: { foo: 'bar' }, usedStructured: true });
  });
});

describe('callLLMStructured — gemini (responseSchema)', () => {
  it('sends responseMimeType + responseSchema and parses the JSON text', async () => {
    const fn = stubFetchOnce({ candidates: [{ content: { parts: [{ text: '{"foo":"bar"}' }] } }] });
    const r = await callLLMStructured({ provider: 'gemini', apiKey: 'k', prompt: 'p', schema: SCHEMA });
    const gc = bodyOf(fn).generationConfig;
    expect(gc.responseMimeType).toBe('application/json');
    expect(gc.responseSchema).toEqual(SCHEMA); // no nullable fields — passes through unchanged
    expect(r).toEqual({ data: { foo: 'bar' }, usedStructured: true });
  });

  // Regression: Gemini's responseSchema is OpenAPI-subset, not full JSON Schema —
  // it has no `type: [...]` nullability union and rejects `null` inside `enum`.
  // A schema authored the JSON-Schema way (as JD_EXTRACT_SCHEMA is) must be
  // translated to Gemini's `nullable: true` form, or every Gemini structured call
  // against a nullable schema throws and silently falls back to safeJsonParse.
  it('translates JSON-Schema nullable unions (type array, enum-with-null) into nullable: true', async () => {
    const nullableSchema: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: ['string', 'null'] },
        workModel: { type: ['string', 'null'], enum: ['Remote', 'Hybrid', 'Onsite', null] },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'workModel', 'tags'],
    };
    const fn = stubFetchOnce({ candidates: [{ content: { parts: [{ text: '{"name":null,"workModel":"Remote","tags":[]}' }] } }] });
    const r = await callLLMStructured({ provider: 'gemini', apiKey: 'k', prompt: 'p', schema: nullableSchema });
    const sent = bodyOf(fn).generationConfig.responseSchema;
    expect(sent.properties.name).toEqual({ type: 'string', nullable: true });
    expect(sent.properties.workModel).toEqual({ type: 'string', nullable: true, enum: ['Remote', 'Hybrid', 'Onsite'] });
    expect(sent.properties.tags).toEqual({ type: 'array', items: { type: 'string' } }); // non-nullable field untouched
    expect(r).toEqual({ data: { name: null, workModel: 'Remote', tags: [] }, usedStructured: true });
  });
});

describe('callLLMStructured — fallback ladder', () => {
  it('falls back to plain callLLM + safeJsonParse for a provider with no structured mode (mimo)', async () => {
    const fn = stubFetchOnce({ choices: [{ message: { content: 'Sure: {"foo":"bar"} thanks' } }] });
    const r = await callLLMStructured({ provider: 'mimo', apiKey: 'k', prompt: 'p', schema: SCHEMA });
    expect(urlOf(fn)).toBe('https://token-plan-sgp.xiaomimimo.com/v1/chat/completions');
    expect(r).toEqual({ data: { foo: 'bar' }, usedStructured: false });
  });

  it('falls back to plain callLLM when the structured call throws (e.g. HTTP error)', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      call += 1;
      // First call (structured, forced tool_choice) fails; second call (plain callLLM
      // fallback, no tool_choice) succeeds.
      if (call === 1) return jsonResponse({ error: { message: 'bad request' } }, 400);
      return jsonResponse({ content: [{ type: 'text', text: '{"foo":"bar"}' }] });
    }));
    const r = await callLLMStructured({ provider: 'anthropic', apiKey: 'k', prompt: 'p', schema: SCHEMA });
    expect(r).toEqual({ data: { foo: 'bar' }, usedStructured: false });
    expect(call).toBe(2);
  });

  it('returns null data (not a throw) when the fallback text is unparseable', async () => {
    stubFetchOnce({ choices: [{ message: { content: 'not json at all' } }] });
    const r = await callLLMStructured({ provider: 'mimo', apiKey: 'k', prompt: 'p', schema: SCHEMA });
    expect(r).toEqual({ data: null, usedStructured: false });
  });
});
