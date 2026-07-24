import { describe, it, expect, vi, afterEach } from 'vitest';
import { runSearchAgent, groundedCall } from './agent.js';

// --- helpers -------------------------------------------------------------

function jsonResponse(data: any, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

// Route fetch by URL substring. Each route's `respond(callIndex)` sees how many
// times THAT route has been hit (0-indexed), so we can return a tool_use turn
// first and a final answer next.
type Route = { match: string; respond: (i: number) => { data: any; status?: number } };
function routerFetch(routes: Route[]) {
  const counts = new Map<string, number>();
  const fn = vi.fn(async (url: string) => {
    for (const r of routes) {
      if (url.includes(r.match)) {
        const i = counts.get(r.match) ?? 0;
        counts.set(r.match, i + 1);
        const { data, status } = r.respond(i);
        return jsonResponse(data, status ?? 200);
      }
    }
    throw new Error(`unrouted fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function bodiesFor(fn: any, match: string) {
  return fn.mock.calls.filter((c: any[]) => (c[0] as string).includes(match)).map((c: any[]) => JSON.parse(c[1].body));
}

const SERPER = { organic: [{ title: 'Acme Inc', link: 'https://acme.com', snippet: 'rockets' }] };

// Anthropic content blocks for a web_search tool call and a final answer.
const antToolUse = { data: { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_1', name: 'web_search', input: { query: 'Acme' } }] } };
const antFinal = { data: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Acme builds rockets.' }] } };

afterEach(() => vi.unstubAllGlobals());

// --- agent loop: anthropic dialect ---------------------------------------

describe('runSearchAgent — anthropic tool loop', () => {
  it('runs web_search, feeds the result back, and returns the final answer + sources', async () => {
    const fn = routerFetch([
      { match: 'anthropic.com', respond: (i) => (i === 0 ? antToolUse : antFinal) },
      { match: 'serper.dev', respond: () => ({ data: SERPER }) },
    ]);
    const r = await runSearchAgent({ provider: 'anthropic', apiKey: 'sk', prompt: 'research Acme', serperKey: 'serp' });

    const antBodies = bodiesFor(fn, 'anthropic.com');
    expect(antBodies).toHaveLength(2);
    // First turn advertises the tools.
    expect(antBodies[0].tools.map((t: any) => t.name)).toEqual(['web_search', 'fetch_url']);
    // Second turn carries the tool_result back to the model.
    const followup = antBodies[1].messages.at(-1);
    expect(followup.role).toBe('user');
    expect(followup.content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'tu_1' });

    expect(r.text).toBe('Acme builds rockets.');
    expect(r.grounded).toBe(true);
    expect(r.via).toBe('agent-loop');
    expect(r.sources).toEqual([{ title: 'Acme Inc', url: 'https://acme.com' }]);
  });

  it('terminates at the max tool-turn cap and forces a tool-free final answer', async () => {
    const fn = routerFetch([
      // Always ask for another search; the final (6th) forced call still returns tool_use
      // but the loop ignores it and takes the text.
      { match: 'anthropic.com', respond: (i) => (i < 5 ? antToolUse : antFinal) },
      { match: 'serper.dev', respond: () => ({ data: SERPER }) },
    ]);
    const r = await runSearchAgent({ provider: 'anthropic', apiKey: 'sk', prompt: 'p', serperKey: 'serp' });
    const antBodies = bodiesFor(fn, 'anthropic.com');
    // 5 tool turns + 1 forced final = 6 calls; the last one has NO tools.
    expect(antBodies).toHaveLength(6);
    expect(antBodies[5].tools).toBeUndefined();
    expect(r.text).toBe('Acme builds rockets.');
  });

  it('without a serper key, web_search returns an error string and no serper call is made', async () => {
    const fn = routerFetch([
      { match: 'anthropic.com', respond: (i) => (i === 0 ? antToolUse : antFinal) },
      { match: 'serper.dev', respond: () => ({ data: SERPER }) },
    ]);
    const r = await runSearchAgent({ provider: 'anthropic', apiKey: 'sk', prompt: 'p' });
    // No serper key → the tool never calls serper.
    expect(fn.mock.calls.some((c: any[]) => (c[0] as string).includes('serper.dev'))).toBe(false);
    const followup = bodiesFor(fn, 'anthropic.com')[1].messages.at(-1);
    expect(followup.content[0].content).toContain('no search API key');
    expect(r.text).toBe('Acme builds rockets.');
    expect(r.sources).toEqual([]);
  });
});

// --- agent loop: openai-compatible dialect (mimo) ------------------------

const oaiToolCall = { data: { choices: [{ message: { role: 'assistant', content: '', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'web_search', arguments: '{"query":"Acme"}' } }] } }] } };
const oaiFinal = { data: { choices: [{ message: { role: 'assistant', content: 'Acme builds rockets.' } }] } };

describe('runSearchAgent — openai-compatible tool loop', () => {
  it('executes tool_calls and replays them as role:"tool" messages', async () => {
    const fn = routerFetch([
      { match: 'xiaomimimo.com', respond: (i) => (i === 0 ? oaiToolCall : oaiFinal) },
      { match: 'serper.dev', respond: () => ({ data: SERPER }) },
    ]);
    const r = await runSearchAgent({ provider: 'mimo', apiKey: 'k', prompt: 'research Acme', serperKey: 'serp' });

    const bodies = bodiesFor(fn, 'xiaomimimo.com');
    expect(bodies).toHaveLength(2);
    expect(bodies[0].tools.map((t: any) => t.function.name)).toEqual(['web_search', 'fetch_url']);
    const toolMsg = bodies[1].messages.at(-1);
    expect(toolMsg).toMatchObject({ role: 'tool', tool_call_id: 'call_1' });
    expect(toolMsg.content).toContain('acme.com');

    expect(r.text).toBe('Acme builds rockets.');
    expect(r.grounded).toBe(true);
    expect(r.via).toBe('agent-loop');
    expect(r.sources).toEqual([{ title: 'Acme Inc', url: 'https://acme.com' }]);
  });
});

// --- fallback ladder -----------------------------------------------------

describe('groundedCall — fallback ladder', () => {
  it('anthropic: uses native search when it succeeds (no agent loop)', async () => {
    const fn = routerFetch([
      { match: 'anthropic.com', respond: () => ({ data: { content: [
        { type: 'web_search_tool_result', content: [{ type: 'web_search_result', title: 'S', url: 'https://s.com' }] },
        { type: 'text', text: 'native answer' },
      ] } }) },
    ]);
    const r = await groundedCall({ provider: 'anthropic', apiKey: 'sk', prompt: 'p' });
    expect(fn).toHaveBeenCalledTimes(1); // single native call, no loop
    expect(r.via).toBe('anthropic-native');
    expect(r.grounded).toBe(true);
    expect(r.text).toBe('native answer');
  });

  it('mimo: no native search → runs the agent loop', async () => {
    const fn = routerFetch([
      { match: 'xiaomimimo.com', respond: (i) => (i === 0 ? oaiToolCall : oaiFinal) },
      { match: 'serper.dev', respond: () => ({ data: SERPER }) },
    ]);
    const r = await groundedCall({ provider: 'mimo', apiKey: 'k', prompt: 'p', serperKey: 'serp' });
    expect(r.via).toBe('agent-loop');
    expect(r.grounded).toBe(true);
    expect(bodiesFor(fn, 'xiaomimimo.com')).toHaveLength(2);
  });

  it('anthropic native fails + no serper key → ungrounded plain completion', async () => {
    const fn = routerFetch([
      // Native call (advertises the web_search tool) fails; plain callLLM (no tools) succeeds.
      { match: 'anthropic.com', respond: (i) => (i === 0
        ? { data: { error: { message: 'boom' } }, status: 500 }
        : { data: { content: [{ type: 'text', text: 'ungrounded answer' }] } }) },
    ]);
    const r = await groundedCall({ provider: 'anthropic', apiKey: 'sk', prompt: 'p' });
    expect(fn).toHaveBeenCalledTimes(2); // failed native, then plain fallback
    expect(r.via).toBe('ungrounded');
    expect(r.grounded).toBe(false);
    expect(r.text).toBe('ungrounded answer');
  });
});
