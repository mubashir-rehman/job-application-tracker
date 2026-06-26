// Client-side resume extraction. The file never leaves the browser: we read it
// locally and produce a best-effort text/markdown extraction. The Library path
// uses this output directly; the LLM path sends the text to /api/resume/import
// for structuring. Heavy parsers (pdfjs, mammoth, turndown) are lazy-imported
// so they only load when a user actually imports a file.

export type SourceFormat = 'pdf' | 'docx' | 'md' | 'txt';

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.md', '.markdown', '.txt'];
export const ACCEPT_ATTR = '.pdf,.docx,.md,.markdown,.txt';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function detectFormat(file: File): SourceFormat | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'md';
  if (name.endsWith('.txt')) return 'txt';
  return null;
}

function collapseBlankLines(s: string): string {
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  // Vite resolves the ?url suffix to the bundled worker asset URL.
  // @ts-ignore - ?url module has no type declaration
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let text = '';
    let lastX: number | null = null;
    let lastY: number | null = null;
    for (const item of content.items as any[]) {
      if (typeof item.str !== 'string') continue;
      const x = item.transform[4];
      const y = item.transform[5];
      const h = item.height || 10;
      if (lastY !== null && Math.abs(y - lastY) > h * 0.5) {
        text += '\n';
        lastX = null;
      } else if (lastX !== null && x - lastX > 1.5) {
        text += ' ';
      }
      text += item.str;
      lastX = x + (item.width || 0);
      lastY = y;
    }
    pages.push(text);
  }
  return collapseBlankLines(pages.join('\n\n'));
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const turndownMod = await import('turndown');
  const TurndownService = turndownMod.default;
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
  return collapseBlankLines(td.turndown(html));
}

async function extractPlain(file: File): Promise<string> {
  return collapseBlankLines(await file.text());
}

// Extract the best text/markdown from a resume file. Throws on unsupported
// type or oversize. The docx path already yields Markdown (mammoth → turndown);
// pdf/txt yield plain text that the LLM path can further structure.
export async function extractResumeText(file: File): Promise<{ text: string; format: SourceFormat }> {
  const format = detectFormat(file);
  if (!format) {
    throw new Error(`Unsupported file type. Use ${ACCEPTED_EXTENSIONS.join(', ')}.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error('File is larger than 10 MB.');
  }

  let text: string;
  switch (format) {
    case 'pdf':  text = await extractPdf(file); break;
    case 'docx': text = await extractDocx(file); break;
    default:     text = await extractPlain(file); break; // md | txt
  }

  if (!text.trim()) {
    throw new Error('No text could be extracted from this file.');
  }
  return { text, format };
}
