import { describe, it, expect, vi, afterEach } from 'vitest';
import { runScore } from './score.js';

function jsonResponse(data: any, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}
function stubFetchOnce(data: any, status = 200) {
  const fn = vi.fn(async () => jsonResponse(data, status));
  vi.stubGlobal('fetch', fn);
  return fn;
}
function bodyOf(fn: any, n = 0) {
  return JSON.parse(fn.mock.calls[n][1].body);
}

afterEach(() => vi.unstubAllGlobals());

const MASTER = 'Senior Engineer with 6 years building Python services on MySQL.';
const JD = 'We need a Python developer, PostgreSQL experience required.';

describe('runScore — keyless (deterministic coverage only)', () => {
  it('scores from JD tech-tag coverage against the master CV, no LLM call', async () => {
    const fn = vi.fn();
    vi.stubGlobal('fetch', fn);
    const r = await runScore({ masterMd: 'I have used Python extensively.', jdText: JD });
    expect(fn).not.toHaveBeenCalled();
    expect(r.usedLLM).toBe(false);
    expect(r.matched).toContain('Python');
    expect(r.missing).toContain('PostgreSQL');
    expect(r.recommendation).toBe('stretch'); // 1/2 matched = 0.5 ratio
  });
});

describe('runScore — with apiKey (structured positioning verdict)', () => {
  it('forces the Anthropic structured tool call and returns its parsed verdict', async () => {
    const fn = stubFetchOnce({
      content: [{
        type: 'tool_use',
        name: 'positioning_verdict',
        input: { score: 72, recommendation: 'apply', strengths: ['Python depth'], gaps: ['No Postgres'], rationale: 'Good fit.' },
      }],
    });
    const r = await runScore({ masterMd: MASTER, jdText: JD, apiKey: 'sk-ant', provider: 'anthropic' });
    const body = bodyOf(fn);
    expect(body.tools[0].name).toBe('positioning_verdict');
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'positioning_verdict' });
    expect(r).toMatchObject({ score: 72, recommendation: 'apply', strengths: ['Python depth'], gaps: ['No Postgres'], usedLLM: true });
  });

  it('weaves a forwarded research brief into the prompt as non-claimable context', async () => {
    const fn = stubFetchOnce({
      content: [{
        type: 'tool_use',
        name: 'positioning_verdict',
        input: { score: 60, recommendation: 'stretch', strengths: [], gaps: [], rationale: 'ok' },
      }],
    });
    await runScore({
      masterMd: MASTER,
      jdText: JD,
      apiKey: 'sk-ant',
      provider: 'anthropic',
      research: { productOverview: 'Builds rockets.', stackSignals: ['Kubernetes'], via: 'anthropic-native', grounded: true },
    });
    const body = bodyOf(fn);
    const userPrompt = body.messages[0].content as string;
    expect(userPrompt).toContain('SUPPORTING RESEARCH CONTEXT');
    expect(userPrompt).toContain('NEVER a claimable fact');
    expect(userPrompt).toContain('Builds rockets.');
    expect(userPrompt).toContain('Kubernetes');
  });

  it('falls back to the deterministic verdict when the LLM response is unparseable', async () => {
    stubFetchOnce({ content: [{ type: 'text', text: 'not json and no tool_use block' }] });
    const r = await runScore({ masterMd: MASTER, jdText: JD, apiKey: 'sk-ant', provider: 'anthropic' });
    expect(r.usedLLM).toBe(true);
    expect(r.rationale).toContain('Could not parse');
    expect(r.recommendation).toBe('stretch');
  });
});
