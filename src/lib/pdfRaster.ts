// Rasterize a rendered resume PDF into per-page JPEG images. This is the input to
// Track 3's visual-QA loop: the page images are sent to a multimodal BYOK model
// which reviews the layout (see skills/resume-render/SKILL.md → "Visual QA rubric").
//
// Browser-only: it renders each page onto a <canvas>. `pdfjs-dist` and its worker
// are lazy-imported using the same pattern established in resumeImport.ts, so the
// module can be imported in Node without pulling the worker in (the heavy imports
// live inside the function and only run when it is called).

export interface RasterizeOptions {
  scale?: number;    // render scale; higher = sharper images (default 2)
  maxPages?: number; // cap pages rasterized (a resume should be 1–2) (default 4)
}

// Returns one JPEG data URL per page (`data:image/jpeg;base64,...`), in order.
export async function rasterizePdf(
  pdfData: ArrayBuffer | Blob,
  opts: RasterizeOptions = {},
): Promise<string[]> {
  const scale = opts.scale ?? 2;
  const maxPages = opts.maxPages ?? 4;

  const pdfjs = await import('pdfjs-dist');
  // Vite resolves the ?url suffix to the bundled worker asset URL (same as resumeImport.ts).
  // @ts-ignore - ?url module has no type declaration
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = pdfData instanceof Blob ? await pdfData.arrayBuffer() : pdfData;
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pageCount = Math.min(pdf.numPages, maxPages);
  const images: string[] = [];
  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable — cannot rasterize the PDF.');
    // pdfjs v6 wants the canvas alongside the context.
    await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.82));
  }
  return images;
}
