import { describe, it, expect, vi, afterEach } from 'vitest';
import { runVisualQaVision } from './visualQa.js';

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

const IMAGES = ['data:image/jpeg;base64,AAAA', 'data:image/jpeg;base64,BBBB'];

describe('runVisualQaVision — no-vision degradation', () => {
  it('does not call fetch and reports unsupported for a provider with no vision dialect', async () => {
    const fn = vi.fn();
    vi.stubGlobal('fetch', fn);
    const r = await runVisualQaVision({ images: IMAGES, rulesPrompt: 'rules', apiKey: 'k', provider: 'mimo' });
    expect(fn).not.toHaveBeenCalled();
    expect(r).toEqual({ issues: [], supported: false });
  });

  it('reports unsupported for the custom provider too', async () => {
    const r = await runVisualQaVision({ images: IMAGES, rulesPrompt: 'rules', apiKey: 'k', provider: 'custom' });
    expect(r.supported).toBe(false);
  });
});

describe('runVisualQaVision — anthropic vision dialect', () => {
  it('sends base64 image blocks + the rules prompt and parses a clean strict-JSON array', async () => {
    const fn = stubFetchOnce({ content: [{ type: 'text', text: '[]' }] });
    const r = await runVisualQaVision({ images: IMAGES, rulesPrompt: 'Check the pages.', apiKey: 'sk-ant', provider: 'anthropic' });
    const body = bodyOf(fn);
    expect(body.messages[0].content).toHaveLength(3); // 2 images + 1 text
    expect(body.messages[0].content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg' } });
    expect(body.messages[0].content[2]).toEqual({ type: 'text', text: 'Check the pages.' });
    expect(r).toEqual({ issues: [], supported: true });
  });

  it('parses issues out of a fenced/prose-wrapped JSON array', async () => {
    stubFetchOnce({
      content: [{ type: 'text', text: 'Here you go:\n```json\n[{"issue":"orphaned heading","severity":"high","lever":"jobBefore","note":"page 2"}]\n```' }],
    });
    const r = await runVisualQaVision({ images: IMAGES, rulesPrompt: 'rules', apiKey: 'k', provider: 'anthropic' });
    expect(r.issues).toEqual([{ issue: 'orphaned heading', severity: 'high', lever: 'jobBefore', note: 'page 2' }]);
  });

  it('handles malformed JSON gracefully — returns an empty issue list, not a throw', async () => {
    stubFetchOnce({ content: [{ type: 'text', text: 'The pages look fine, no JSON here.' }] });
    const r = await runVisualQaVision({ images: IMAGES, rulesPrompt: 'rules', apiKey: 'k', provider: 'anthropic' });
    expect(r).toEqual({ issues: [], supported: true });
  });

  it('defaults an invalid/missing severity to "low" and a missing lever to null', async () => {
    stubFetchOnce({ content: [{ type: 'text', text: '[{"issue":"minor spacing"}]' }] });
    const r = await runVisualQaVision({ images: IMAGES, rulesPrompt: 'rules', apiKey: 'k', provider: 'anthropic' });
    expect(r.issues).toEqual([{ issue: 'minor spacing', severity: 'low', lever: null, note: undefined }]);
  });
});

describe('runVisualQaVision — openai vision dialect', () => {
  it('sends image_url content parts with the data URL directly', async () => {
    const fn = stubFetchOnce({ choices: [{ message: { content: '[]' } }] });
    await runVisualQaVision({ images: IMAGES, rulesPrompt: 'rules', apiKey: 'sk-oai', provider: 'openai' });
    const body = bodyOf(fn);
    expect(body.messages[0].content[1]).toEqual({ type: 'image_url', image_url: { url: IMAGES[0] } });
  });
});

describe('runVisualQaVision — gemini vision dialect', () => {
  it('sends inlineData parts with mimeType + base64 split from the data URL', async () => {
    const fn = stubFetchOnce({ candidates: [{ content: { parts: [{ text: '[]' }] } }] });
    await runVisualQaVision({ images: IMAGES, rulesPrompt: 'rules', apiKey: 'g-key', provider: 'gemini' });
    const body = bodyOf(fn);
    expect(body.contents[0].parts[1]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } });
  });
});

describe('runVisualQaVision — provider error', () => {
  it('reports supported:true with an error message rather than throwing', async () => {
    stubFetchOnce({ error: { message: 'rate limited' } }, 429);
    const r = await runVisualQaVision({ images: IMAGES, rulesPrompt: 'rules', apiKey: 'k', provider: 'anthropic' });
    expect(r.supported).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.error).toContain('rate limited');
  });
});

describe('runVisualQaVision — empty images', () => {
  it('short-circuits without calling fetch', async () => {
    const fn = vi.fn();
    vi.stubGlobal('fetch', fn);
    const r = await runVisualQaVision({ images: [], rulesPrompt: 'rules', apiKey: 'k', provider: 'anthropic' });
    expect(fn).not.toHaveBeenCalled();
    expect(r).toEqual({ issues: [], supported: true });
  });
});
