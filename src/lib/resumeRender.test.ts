import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { buildResumeDocx, generatePdf, splitTrailingDate } from './resumeRender';

// A minimal but representative resume: name + contact, a job header with a trailing
// date range, bold lead-in bullets, and standard sections.
const FIXTURE = `# Ada Lovelace
ada@example.com · San Francisco, CA

## Experience

### Senior Engineer — Acme Corp | Jan 2026 – Mar 2026
- **Led** the migration of the billing platform to TypeScript.
- Cut p95 latency by 40% across the API fleet.

## Skills
- TypeScript, React, Node.js, PostgreSQL

## Education

### B.S. Computer Science — MIT | 2015 – 2019
`;

describe('splitTrailingDate', () => {
  it('splits a pipe-delimited trailing date range', () => {
    expect(splitTrailingDate('Senior Engineer — Acme Corp | Jan 2026 – Mar 2026'))
      .toEqual({ main: 'Senior Engineer — Acme Corp', date: 'Jan 2026 – Mar 2026' });
  });
  it('splits an explicit tab', () => {
    expect(splitTrailingDate('Role\t2020 – Present')).toEqual({ main: 'Role', date: '2020 – Present' });
  });
  it('returns null date for a header with no date', () => {
    expect(splitTrailingDate('Projects')).toEqual({ main: 'Projects', date: null });
  });
});

describe('buildResumeDocx', () => {
  it('applies the navy single-column tokens to the produced XML', async () => {
    const blob = await buildResumeDocx(FIXTURE);
    const buf = Buffer.from(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const documentXml = await zip.file('word/document.xml')!.async('string');
    const stylesXml = await zip.file('word/styles.xml')!.async('string');

    // Calibri default font lives in styles.xml (docDefaults).
    expect(stylesXml).toContain('Calibri');
    // Navy section-header color (also used for the bottom border).
    expect(documentXml).toContain('1F3864');
    // keepNext keeps job headers from orphaning.
    expect(documentXml).toContain('<w:keepNext');
    // Right tab stop at the content width pushes the date to the margin.
    expect(documentXml).toContain('w:pos="10080"');
    expect(documentXml).toContain('w:val="right"');
  });

  it('re-renders with lever-adjusted spacing when passed modified tokens', async () => {
    // Simulate a QA-loop lever pull: bulletAfter 60 → 40.
    const base = (await import('../../skills/resume-render/tokens.json')).default;
    const tuned = JSON.parse(JSON.stringify(base));
    tuned.spacing.bulletAfter = 40;
    const blob = await buildResumeDocx(FIXTURE, tuned);
    expect(blob.size).toBeGreaterThan(0);
  });
});

// pdfjs text extraction is the preferred path but is environment-sensitive in Node;
// fall back to scanning the (uncompressed) PDF content streams so the smoke test is
// deterministic without a canvas.
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    // @ts-ignore - legacy build subpath has no bundled types here
    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
    let text = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const content = await (await pdf.getPage(p)).getTextContent();
      text += content.items.map((i: any) => i.str ?? '').join(' ') + ' ';
    }
    return text;
  } catch {
    return new TextDecoder('latin1').decode(bytes);
  }
}

describe('generatePdf', () => {
  it('produces a valid 1–2 page PDF containing the name and a section header', async () => {
    const blob = await generatePdf(FIXTURE);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    // %PDF magic bytes.
    expect(new TextDecoder('latin1').decode(bytes.slice(0, 5))).toBe('%PDF-');

    // Reliable page count via pdf-lib reload.
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(reloaded.getPageCount()).toBeLessThanOrEqual(2);

    const text = await extractPdfText(bytes);
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('EXPERIENCE'); // section headers are upper-cased per tokens
  });
});
