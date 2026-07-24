import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Same pdfjs-dist mocking pattern as pdfRaster.test.ts — a fake canvas backend
// lets rasterizePdf's page-iteration logic run without a real renderer.
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'pdf.worker.min.mjs' }));
const getDocumentMock = vi.fn();
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (...args: any[]) => getDocumentMock(...args),
}));

import { runVisualQa, DEFAULT_VISUAL_QA_RUBRIC } from './visualQa';
import defaultTokens from '../../skills/resume-render/tokens.json';

const FIXTURE = `# Ada Lovelace
ada@example.com

## Experience

### Senior Engineer — Acme Corp | Jan 2026 – Mar 2026
- **Led** the migration of the billing platform to TypeScript.

## Skills
- TypeScript, React
`;

const fakePage = {
  getViewport: () => ({ width: 612, height: 792 }),
  render: () => ({ promise: Promise.resolve() }),
};
function installFakeCanvas() {
  const canvas = { width: 0, height: 0, getContext: () => ({}), toDataURL: () => 'data:image/jpeg;base64,AAAA' };
  (globalThis as any).document = { createElement: () => canvas };
}

function jsonResponse(data: any, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

beforeEach(() => {
  installFakeCanvas();
  getDocumentMock.mockReset();
  // A single-page PDF for every rasterize call unless a test overrides it.
  getDocumentMock.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve(fakePage) }) });
});
afterEach(() => {
  delete (globalThis as any).document;
  vi.unstubAllGlobals();
});

describe('runVisualQa — deterministic checks', () => {
  it('always computes page count, ATS coverage, and min font size, even before any vision call', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ issues: [], supported: true })));
    const r = await runVisualQa({ resumeMd: FIXTURE, jdText: 'TypeScript React', provider: 'anthropic', apiKey: 'k' });
    const ids = r.deterministic.map((c) => c.id);
    expect(ids).toEqual(['pageCount', 'atsCoverage', 'minFontSize']);
    expect(r.deterministic.find((c) => c.id === 'pageCount')!.detail).toContain('1 page');
  });
});

describe('runVisualQa — clean pass', () => {
  it('stops after one iteration when the model reports no issues', async () => {
    const fn = vi.fn(async () => jsonResponse({ issues: [], supported: true }));
    vi.stubGlobal('fetch', fn);
    const r = await runVisualQa({ resumeMd: FIXTURE, jdText: 'TypeScript', provider: 'anthropic', apiKey: 'k' });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(r.iterations).toHaveLength(1);
    expect(r.degraded).toBe(false);
    expect(r.finalTokens.spacing.bulletAfter).toBe(defaultTokens.spacing.bulletAfter);
  });
});

describe('runVisualQa — issue → lever application', () => {
  it('advances the bulletAfter lever and re-renders when the model reports a fixable issue then clears', async () => {
    let call = 0;
    const fn = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return jsonResponse({
          issues: [{ issue: 'cramped bullets', severity: 'medium', lever: 'bulletAfter', note: 'page 1' }],
          supported: true,
        });
      }
      return jsonResponse({ issues: [], supported: true }); // clean on the re-check
    });
    vi.stubGlobal('fetch', fn);
    const r = await runVisualQa({ resumeMd: FIXTURE, jdText: 'TypeScript', provider: 'anthropic', apiKey: 'k' });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(r.iterations).toHaveLength(2);
    expect(r.iterations[0].leverApplied).toBe('bulletAfter');
    // bulletAfter steps: [60, 40, 32] — first step down from the shipped default.
    expect(r.finalTokens.spacing.bulletAfter).toBe(40);
    expect(r.finalTokens.spacing.bulletAfter).not.toBe(defaultTokens.spacing.bulletAfter);
  });

  it('stops once a lever is exhausted (jobBefore has only 2 steps)', async () => {
    const fn = vi.fn(async () => jsonResponse({
      issues: [{ issue: 'orphaned heading', severity: 'high', lever: 'jobBefore', note: 'page 2' }],
      supported: true,
    }));
    vi.stubGlobal('fetch', fn);
    const r = await runVisualQa({ resumeMd: FIXTURE, jdText: 'TypeScript', provider: 'anthropic', apiKey: 'k', maxIterations: 5 });
    // jobBefore: [140, 110] — one step down, then exhausted on the second report.
    expect(r.finalTokens.spacing.jobBefore).toBe(110);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(r.iterations).toHaveLength(2);
  });

  it('does not apply a lever for an issue with lever: null', async () => {
    const fn = vi.fn(async () => jsonResponse({
      issues: [{ issue: 'wrong header color', severity: 'low', lever: null }],
      supported: true,
    }));
    vi.stubGlobal('fetch', fn);
    const r = await runVisualQa({ resumeMd: FIXTURE, jdText: 'TypeScript', provider: 'anthropic', apiKey: 'k' });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(r.finalTokens.spacing).toEqual(defaultTokens.spacing);
  });
});

describe('runVisualQa — iteration cap', () => {
  it('never exceeds maxIterations even when the model keeps reporting fixable issues', async () => {
    const fn = vi.fn(async () => jsonResponse({
      issues: [{ issue: 'still cramped', severity: 'medium', lever: 'bulletAfter' }],
      supported: true,
    }));
    vi.stubGlobal('fetch', fn);
    const r = await runVisualQa({ resumeMd: FIXTURE, jdText: 'TypeScript', provider: 'anthropic', apiKey: 'k', maxIterations: 2 });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(r.iterations).toHaveLength(2);
  });
});

describe('runVisualQa — graceful degradation', () => {
  it('falls back to deterministic-only when the provider has no vision support', async () => {
    const fn = vi.fn(async () => jsonResponse({ issues: [], supported: false }));
    vi.stubGlobal('fetch', fn);
    const r = await runVisualQa({ resumeMd: FIXTURE, jdText: 'TypeScript', provider: 'mimo', apiKey: 'k' });
    expect(r.degraded).toBe(true);
    expect(r.notice).toMatch(/no vision support/i);
    expect(r.deterministic.length).toBeGreaterThan(0); // deterministic checks still ran
  });

  it('falls back gracefully when the vision request itself throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'bad request' }, 500)));
    const r = await runVisualQa({ resumeMd: FIXTURE, jdText: 'TypeScript', provider: 'anthropic', apiKey: 'k' });
    expect(r.degraded).toBe(true);
    expect(r.notice).toBeTruthy();
  });
});

describe('DEFAULT_VISUAL_QA_RUBRIC', () => {
  it('requests the documented strict-JSON array contract', () => {
    expect(DEFAULT_VISUAL_QA_RUBRIC).toContain('STRICT JSON');
    expect(DEFAULT_VISUAL_QA_RUBRIC).toContain('"lever"');
  });
});
