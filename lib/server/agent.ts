// Tool-calling agent loop — grounded research for providers WITHOUT native web
// search (mimo, custom OpenAI-compatible endpoints, and any provider whose native
// search failed). Runs a short multi-turn function-calling loop with two LOCAL
// tools: web_search (serper.dev) and fetch_url (server-side page fetch). No SDKs —
// plain fetch, both provider dialects hand-rolled. BYOK keys travel only in headers.

import {
  LLMOptions,
  Provider,
  SearchResult,
  Source,
  LLMError,
  DEFAULT_MODEL,
  OPENAI_COMPATIBLE_BASE,
  tokenBudget,
  dedupeSources,
  callLLM,
  callLLMWithSearch,
} from './llm.js';
import { serperSearch } from './search.js';
import { fetchUrlText } from './fetchText.js';

const MAX_TOOL_TURNS = 5; // hard cap; then we force a final, tool-free answer.

// Tool descriptions shared across dialects (WHY: one source of truth for the schema).
const WEB_SEARCH_DESC = 'Search the web for current information. Returns organic results with titles, links and snippets.';
const FETCH_URL_DESC = 'Fetch the readable text of a web page by URL. Use after web_search to read a promising result in full.';

export interface AgentOptions extends LLMOptions {
  serperKey?: string; // serper.dev key backing the web_search tool (BYOK, per-request)
}

// Execute a local tool call, pushing any discovered links into `sources`. Returns
// a string result fed straight back to the model. Never throws — tool failures are
// reported to the model as text so it can adapt (e.g. try a different query).
async function execTool(name: string, input: any, serperKey: string | undefined, sources: Source[]): Promise<string> {
  if (name === 'web_search') {
    const query = String(input?.query ?? '').trim();
    if (!query) return 'web_search error: missing "query".';
    if (!serperKey) return 'web_search unavailable: no search API key is configured. Answer using your own knowledge instead.';
    try {
      const r = await serperSearch(serperKey, query);
      for (const o of r.organic || []) if (o.link) sources.push({ title: o.title || '', url: o.link });
      return JSON.stringify({
        answerBox: r.answerBox,
        knowledgeGraph: r.knowledgeGraph,
        organic: (r.organic || []).slice(0, 6).map((o) => ({ title: o.title, link: o.link, snippet: o.snippet })),
      });
    } catch (e) {
      return `web_search error: ${(e as Error).message}`;
    }
  }
  if (name === 'fetch_url') {
    const url = String(input?.url ?? '').trim();
    if (!url) return 'fetch_url error: missing "url".';
    try {
      const text = await fetchUrlText(url);
      sources.push({ title: url, url });
      return text.slice(0, 6000);
    } catch (e) {
      return `fetch_url error: ${(e as Error).message}`;
    }
  }
  return `unknown tool: ${name}`;
}

// Pick the function-calling dialect from the provider. Anthropic uses Messages
// tool_use/tool_result blocks; everything OpenAI-compatible (openai/mimo/custom)
// uses chat-completions tool_calls + role:"tool" messages.
function isAnthropic(p: Provider): boolean {
  return p === 'anthropic';
}

export async function runSearchAgent(opts: AgentOptions): Promise<SearchResult> {
  return isAnthropic(opts.provider) ? runAnthropicLoop(opts) : runOpenAILoop(opts);
}

// ---------------- Anthropic Messages tool loop ----------------

const ANTHROPIC_TOOLS = [
  { name: 'web_search', description: WEB_SEARCH_DESC, input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'fetch_url', description: FETCH_URL_DESC, input_schema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
];

async function anthropicCall(opts: AgentOptions, messages: any[], withTools: boolean): Promise<any> {
  const { total } = tokenBudget(opts.maxTokens, opts.thinking, 2000);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL.anthropic,
      max_tokens: total,
      ...(opts.system ? { system: opts.system } : {}),
      messages,
      ...(withTools ? { tools: ANTHROPIC_TOOLS } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `Anthropic agent error ${res.status}`, res.status);
  return data;
}

async function runAnthropicLoop(opts: AgentOptions): Promise<SearchResult> {
  const messages: any[] = [{ role: 'user', content: opts.prompt }];
  const sources: Source[] = [];
  let usedTool = false;

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const data = await anthropicCall(opts, messages, true);
    const blocks = Array.isArray(data?.content) ? data.content : [];
    // Preserve the assistant turn verbatim (incl. thinking + tool_use blocks) so
    // the follow-up tool_result references stay valid.
    messages.push({ role: 'assistant', content: blocks });
    const toolUses = blocks.filter((b: any) => b?.type === 'tool_use');
    if (toolUses.length === 0) {
      return { text: extractAnthropicText(blocks), sources: dedupeSources(sources), grounded: usedTool, via: 'agent-loop' };
    }
    usedTool = true;
    const results = [];
    for (const tu of toolUses) {
      const out = await execTool(tu.name, tu.input, opts.serperKey, sources);
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: out });
    }
    messages.push({ role: 'user', content: results });
  }

  // Turn budget exhausted — force a tool-free final answer.
  const final = await anthropicCall(opts, messages, false);
  const blocks = Array.isArray(final?.content) ? final.content : [];
  return { text: extractAnthropicText(blocks), sources: dedupeSources(sources), grounded: usedTool, via: 'agent-loop' };
}

function extractAnthropicText(blocks: any[]): string {
  return blocks.filter((b) => b?.type === 'text').map((b) => b.text).join('');
}

// ---------------- OpenAI-compatible chat-completions tool loop ----------------

const OPENAI_TOOLS = [
  { type: 'function', function: { name: 'web_search', description: WEB_SEARCH_DESC, parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'fetch_url', description: FETCH_URL_DESC, parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
];

// Resolve the base URL for the OpenAI-compatible provider (custom needs an explicit one).
function openAIBase(opts: AgentOptions): string {
  if (opts.provider === 'custom') {
    const base = opts.baseUrl?.trim().replace(/\/+$/, '');
    if (!base) throw new LLMError('Custom provider requires a base URL', 400);
    return base;
  }
  const base = OPENAI_COMPATIBLE_BASE[opts.provider];
  if (!base) throw new LLMError(`No base URL for provider '${opts.provider}'`, 400);
  return base;
}

function openAIModel(opts: AgentOptions): string {
  return opts.model || DEFAULT_MODEL[opts.provider] || '';
}

async function openAICall(opts: AgentOptions, base: string, messages: any[], withTools: boolean): Promise<any> {
  const { total } = tokenBudget(opts.maxTokens, opts.thinking, 2000);
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${opts.apiKey}` },
    body: JSON.stringify({
      model: openAIModel(opts),
      max_tokens: total,
      messages,
      ...(withTools ? { tools: OPENAI_TOOLS, tool_choice: 'auto' } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LLMError(data?.error?.message || `LLM agent error ${res.status}`, res.status);
  return data;
}

async function runOpenAILoop(opts: AgentOptions): Promise<SearchResult> {
  const base = openAIBase(opts);
  const messages: any[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: opts.prompt });
  const sources: Source[] = [];
  let usedTool = false;

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const data = await openAICall(opts, base, messages, true);
    const msg = data?.choices?.[0]?.message ?? {};
    const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
    // Echo the assistant message back (with its tool_calls) before answering them.
    messages.push({ role: 'assistant', content: msg.content ?? '', ...(toolCalls.length ? { tool_calls: toolCalls } : {}) });
    if (toolCalls.length === 0) {
      return { text: msg.content ?? '', sources: dedupeSources(sources), grounded: usedTool, via: 'agent-loop' };
    }
    usedTool = true;
    for (const call of toolCalls) {
      let input: any = {};
      try { input = JSON.parse(call?.function?.arguments || '{}'); } catch { input = {}; }
      const out = await execTool(call?.function?.name, input, opts.serperKey, sources);
      messages.push({ role: 'tool', tool_call_id: call.id, content: out });
    }
  }

  // Exhausted the tool budget — force a final answer with tools disabled.
  const data = await openAICall(opts, base, messages, false);
  return { text: data?.choices?.[0]?.message?.content ?? '', sources: dedupeSources(sources), grounded: usedTool, via: 'agent-loop' };
}

// ---------------- Fallback ladder ----------------

// Grounded call with a graceful ladder: provider-native web search → our tool loop
// (when a serper key or an OpenAI-dialect provider is available) → plain ungrounded
// completion. Never throws for "search unsupported" — returns grounded:false instead.
export async function groundedCall(opts: AgentOptions): Promise<SearchResult> {
  const { provider } = opts;

  // 1) Native provider search where it exists.
  if (provider === 'gemini' || provider === 'anthropic' || provider === 'openai') {
    try {
      return await callLLMWithSearch(opts);
    } catch {
      // fall through — native unavailable or the call failed.
    }
  }

  // 2) Agent loop — needs either a serper key (any provider) or an OpenAI-dialect
  // provider whose endpoint might expose usable tool calling even without serper.
  const openAIDialect = provider === 'openai' || provider === 'mimo' || provider === 'custom';
  if (opts.serperKey || openAIDialect) {
    try {
      return await runSearchAgent(opts);
    } catch {
      // fall through to ungrounded.
    }
  }

  // 3) Ungrounded final fallback.
  const text = await callLLM(opts);
  return { text, sources: [], grounded: false, via: 'ungrounded' };
}
