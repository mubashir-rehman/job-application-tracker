// Stage 5 — render the tailored resume into two artifacts:
//   • a single-column, ATS-safe .docx (built with the `docx` library)
//   • a designed PDF via the browser's print-to-PDF (vector, zero extra deps)
// One small Markdown block-parser feeds both renderers. Everything runs in the
// browser — the resume never leaves the machine.

export interface Block {
  type: 'h1' | 'h2' | 'h3' | 'li' | 'p';
  text: string;
}

// Split the tailor output into the resume and the appended coaching sections
// (Tailoring Inventory + Honesty & Verification Notes) so only the resume renders.
export function splitTailored(md: string): { resumeMd: string; extrasMd: string } {
  const m = md.match(/\n-{3,}\s*\n+##\s+Tailoring Inventory|##\s+Tailoring Inventory/i);
  if (!m || m.index == null) return { resumeMd: md.trim(), extrasMd: '' };
  return {
    resumeMd: md.slice(0, m.index).replace(/\n-{3,}\s*$/, '').trim(),
    extrasMd: md.slice(m.index).replace(/^\s*-{3,}\s*/, '').trim(),
  };
}

// Parse the constrained resume Markdown into blocks. Horizontal rules and blank
// lines are dropped (they carry no resume content).
export function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim() || /^-{3,}$/.test(line.trim())) continue;
    if (line.startsWith('### ')) blocks.push({ type: 'h3', text: line.slice(4).trim() });
    else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3).trim() });
    else if (line.startsWith('# ')) blocks.push({ type: 'h1', text: line.slice(2).trim() });
    else if (/^[-*]\s+/.test(line.trim())) blocks.push({ type: 'li', text: line.trim().replace(/^[-*]\s+/, '') });
    else blocks.push({ type: 'p', text: line.trim() });
  }
  return blocks;
}

// Split inline **bold** into runs of { text, bold }.
function inlineRuns(text: string): { text: string; bold: boolean }[] {
  return text.split(/\*\*/).map((seg, i) => ({ text: seg, bold: i % 2 === 1 })).filter((r) => r.text);
}

// Strip markdown emphasis for plain-text contexts.
function stripInline(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '');
}

function safeName(s: string): string {
  return (s.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'tailored-resume');
}

function triggerDownload(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Build & download a single-column ATS-safe .docx. `docx` is imported lazily so
// it stays out of the initial bundle (and the PWA precache).
export async function downloadDocx(resumeMd: string, baseName = 'tailored-resume'): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const blocks = parseBlocks(resumeMd);

  const paragraphs = blocks.map((b) => {
    if (b.type === 'h1') return new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: stripInline(b.text), bold: true })] });
    if (b.type === 'h2') return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: stripInline(b.text), bold: true })] });
    if (b.type === 'h3') return new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: stripInline(b.text), bold: true })] });
    if (b.type === 'li') return new Paragraph({ bullet: { level: 0 }, children: inlineRuns(b.text).map((r) => new TextRun({ text: r.text, bold: r.bold })) });
    return new Paragraph({ spacing: { after: 60 }, children: inlineRuns(b.text).map((r) => new TextRun({ text: r.text, bold: r.bold })) });
  });

  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${safeName(baseName)}.docx`);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineHtml(text: string): string {
  return inlineRuns(text).map((r) => (r.bold ? `<strong>${escapeHtml(r.text)}</strong>` : escapeHtml(r.text))).join('');
}

// Render the resume to a styled HTML document for printing.
export function resumeToHtml(resumeMd: string): string {
  const blocks = parseBlocks(resumeMd);
  const body = blocks
    .map((b) => {
      if (b.type === 'h1') return `<h1>${inlineHtml(b.text)}</h1>`;
      if (b.type === 'h2') return `<h2>${inlineHtml(b.text)}</h2>`;
      if (b.type === 'h3') return `<h3>${inlineHtml(b.text)}</h3>`;
      if (b.type === 'li') return `<li>${inlineHtml(b.text)}</li>`;
      return `<p>${inlineHtml(b.text)}</p>`;
    })
    // Wrap consecutive <li> in a single <ul>.
    .reduce((html, el) => {
      if (el.startsWith('<li>')) return html.endsWith('</li>') || html.endsWith('</li></ul>')
        ? html.replace(/<\/ul>$/, '') + el + '</ul>'
        : html + '<ul>' + el + '</ul>';
      return html + el;
    }, '');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Resume</title><style>
    @page { margin: 0.6in; }
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.4; font-size: 11pt; max-width: 7.3in; margin: 0 auto; }
    h1 { font-size: 20pt; margin: 0 0 2px; letter-spacing: .3px; }
    h2 { font-size: 12pt; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1.5px solid #333; padding-bottom: 2px; margin: 16px 0 6px; }
    h3 { font-size: 11pt; margin: 10px 0 2px; }
    p { margin: 2px 0; }
    ul { margin: 4px 0 8px; padding-left: 18px; }
    li { margin: 2px 0; }
    strong { font-weight: 700; }
  </style></head><body>${body}</body></html>`;
}

// Open the styled resume in a new window and trigger the browser print dialog
// (the user picks "Save as PDF"). Vector output, no server, file stays local.
export function printPdf(resumeMd: string): void {
  const html = resumeToHtml(resumeMd);
  const w = window.open('', '_blank', 'width=820,height=1060');
  if (!w) throw new Error('Pop-up blocked — allow pop-ups to export the PDF.');
  w.document.write(html);
  w.document.close();
  w.focus();
  // Give the new document a tick to lay out before printing.
  setTimeout(() => w.print(), 250);
}
