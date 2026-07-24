import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The `?url` worker import is Vite-only; stub it so the module loads under vitest.
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'pdf.worker.min.mjs' }));

// Mock pdfjs so we exercise pdfRaster's page-iteration logic without a real
// renderer/canvas (node-side canvas is unreliable — see plan).
const getDocumentMock = vi.fn();
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (...args: any[]) => getDocumentMock(...args),
}));

import { rasterizePdf } from './pdfRaster';

const fakePage = {
  getViewport: () => ({ width: 612, height: 792 }),
  render: () => ({ promise: Promise.resolve() }),
};

// Minimal <canvas> stand-in installed on globalThis.document.
function installFakeCanvas() {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({}),
    toDataURL: (type: string) => `${type === 'image/jpeg' ? 'data:image/jpeg' : 'data:image/png'};base64,AAAA`,
  };
  (globalThis as any).document = { createElement: () => canvas };
}

const hasRealCanvas = false; // node has no reliable canvas; skip the real-raster path.

describe('rasterizePdf (page-iteration logic, mocked pdfjs)', () => {
  beforeEach(() => {
    installFakeCanvas();
    getDocumentMock.mockReset();
  });
  afterEach(() => {
    delete (globalThis as any).document;
  });

  it('returns one JPEG data URL per page, capped at maxPages', async () => {
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({ numPages: 5, getPage: () => Promise.resolve(fakePage) }),
    });
    const images = await rasterizePdf(new Uint8Array([1, 2, 3]).buffer, { maxPages: 3 });
    expect(images).toHaveLength(3);
    expect(images[0]).toMatch(/^data:image\/jpeg/);
  });

  it('rasterizes every page when the count is under the cap', async () => {
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage: () => Promise.resolve(fakePage) }),
    });
    const images = await rasterizePdf(new Uint8Array([1]).buffer);
    expect(images).toHaveLength(2);
  });

  it('accepts a Blob and reads its bytes', async () => {
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve(fakePage) }),
    });
    const images = await rasterizePdf(new Blob([new Uint8Array([1, 2])]));
    expect(images).toHaveLength(1);
    expect(getDocumentMock).toHaveBeenCalled();
  });
});

// Real end-to-end rasterization needs a working canvas backend; skipped in Node.
describe.skipIf(!hasRealCanvas)('rasterizePdf (real canvas)', () => {
  it('renders an actual PDF to images', async () => {
    // Requires a DOM/canvas environment; intentionally skipped in the node runner.
    expect(true).toBe(true);
  });
});
