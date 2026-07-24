// Stage 5 — render the tailored resume into two artifacts:
//   • a single-column, ATS-safe .docx (built with the `docx` library)
//   • a deterministic, vector .pdf laid out in-browser with `pdf-lib`
// Both renderers share one Markdown block-parser AND one design spec
// (`skills/resume-render/tokens.json`, the "navy single-column" house style), so
// formatting is data, not code — and the Track 3 visual-QA loop can re-render with
// lever-adjusted spacing by passing a modified `tokens` object. Heavy libs (`docx`,
// `pdf-lib`) are lazy-imported so they stay out of the initial bundle. Everything
// runs in the browser — the resume never leaves the machine.
//
// The legacy `printPdf` (browser print dialog) is kept as a fallback only.

// Relative (not `@/…`) so the module resolves identically under Vite and vitest,
// which does not configure the `@` alias.
import defaultTokens from '../../skills/resume-render/tokens.json';

// The shape of the design-token spec. `typeof defaultTokens` keeps it in lock-step
// with tokens.json; the QA loop passes a (cloned + spacing-mutated) copy of this.
export type RenderTokens = typeof defaultTokens;

export { defaultTokens as resumeTokens };

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

// Pull candidate gap bullets from the tailor's "Honesty & Verification Notes"
// section (JD requirements not met / gaps the candidate isn't claiming / claims
// to verify) — used to suggest Knowledge-Bank entries after generating.
export function extractHonestyGaps(tailoredMd: string): string[] {
  return sectionBullets(tailoredMd, /^#{1,6}\s*Honesty/i);
}

// Bullets under a given "## <Section>" heading in the tailor output.
function sectionBullets(md: string, heading: RegExp): string[] {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => heading.test(l));
  if (start === -1) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) break; // next top section ends the list
    const m = lines[i].match(/^\s*[-*]\s+(.*)$/);
    if (m) {
      const t = m[1].replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
      if (t.length > 3) out.push(t);
    }
  }
  return out.slice(0, 12);
}

// "Tailoring Inventory" bullets — what the resume led with / emphasized for this
// role = the candidate's defensible strengths (used to suggest Knowledge-Bank entries).
export function extractInventoryStrengths(tailoredMd: string): string[] {
  return sectionBullets(tailoredMd, /^#{1,6}\s*Tailoring Inventory/i);
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

// A run carrying its bold flag — the shared unit both renderers wrap into lines.
interface StyledRun { text: string; bold: boolean }

// Month tokens for detecting a trailing date range on a job-header line.
const MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December';
const DATE_TOKEN = `(?:(?:${MONTHS})\\.?\\s+\\d{4}|\\d{4}|Present|Current|Now|Ongoing)`;
// A date, optionally a range ("Jan 2026 – Mar 2026", "2020 – Present"), anchored to end.
const TRAILING_DATE = new RegExp(`(${DATE_TOKEN}(?:\\s*(?:[\\u2013\\u2014-]|to)\\s*${DATE_TOKEN})?)\\s*$`, 'i');

// Split a job-header line into its left text and a right-aligned date, if any.
// Precedence: an explicit tab, then a pipe-delimited trailing date, then a bare
// trailing date. Returns date=null when the line carries no date (e.g. a bare role).
export function splitTrailingDate(text: string): { main: string; date: string | null } {
  if (text.includes('\t')) {
    const i = text.lastIndexOf('\t');
    return { main: text.slice(0, i).trim(), date: text.slice(i + 1).trim() || null };
  }
  const pipe = text.lastIndexOf('|');
  if (pipe !== -1) {
    const after = text.slice(pipe + 1).trim();
    if (TRAILING_DATE.test(after)) return { main: text.slice(0, pipe).replace(/[|\s]+$/, '').trim(), date: after };
  }
  const m = text.match(TRAILING_DATE);
  if (m && m.index != null && m.index > 0) {
    const main = text.slice(0, m.index).replace(/[|,–—-]\s*$/, '').trim();
    if (main) return { main, date: m[1].trim() };
  }
  return { main: text, date: null };
}

// Build a single-column ATS-safe .docx from the tokens. `docx` is imported lazily
// so it stays out of the initial bundle (and the PWA precache). Returns the raw
// Blob — `downloadDocx` wraps it for the browser, tests inspect the produced XML.
export async function buildResumeDocx(resumeMd: string, tokens: RenderTokens = defaultTokens): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, Tab, BorderStyle, TabStopType, LineRuleType } = await import('docx');
  const t = tokens;
  const blocks = parseBlocks(resumeMd);

  const paragraphs = blocks.map((b) => {
    if (b.type === 'h1') {
      // Name / title — large, no section chrome.
      return new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: stripInline(b.text), bold: true, size: 40 })] });
    }
    if (b.type === 'h2') {
      // Section header: all-caps, navy, bottom rule.
      return new Paragraph({
        spacing: { before: t.spacing.sectionBefore, after: 80 },
        border: t.sectionHeader.bottomBorder
          ? { bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: t.colors.sectionHeader } }
          : undefined,
        children: [new TextRun({ text: stripInline(b.text), bold: true, allCaps: t.sectionHeader.allCaps, color: t.colors.sectionHeader })],
      });
    }
    if (b.type === 'h3') {
      // Job header: keepNext (never orphan), date pushed right via a positional tab.
      const { main, date } = splitTrailingDate(b.text);
      const children = inlineRuns(main).map((r) => new TextRun({ text: r.text, bold: true }));
      if (date) {
        children.push(new TextRun({ children: [new Tab()] }));
        children.push(new TextRun({ text: date, bold: false }));
      }
      return new Paragraph({
        keepNext: t.pagination.keepNextOnJobHeader,
        spacing: { before: t.spacing.jobBefore, after: 40 },
        tabStops: date ? [{ type: TabStopType.RIGHT, position: t.sectionHeader.tabRightTwips }] : undefined,
        children,
      });
    }
    if (b.type === 'li') {
      // Bullet with bold lead-in runs + token spacing.
      return new Paragraph({
        bullet: { level: 0 },
        spacing: { after: t.spacing.bulletAfter, line: t.spacing.bulletLine, lineRule: LineRuleType.AUTO },
        children: inlineRuns(b.text).map((r) => new TextRun({ text: r.text, bold: r.bold })),
      });
    }
    return new Paragraph({ spacing: { after: t.spacing.bulletAfter }, children: inlineRuns(b.text).map((r) => new TextRun({ text: r.text, bold: r.bold })) });
  });

  const doc = new Document({
    // docDefaults → Calibri body at 11pt in the token body color.
    styles: { default: { document: { run: { font: t.fonts.primary, size: 22, color: t.colors.body } } } },
    sections: [{
      properties: {
        page: {
          size: { width: t.page.widthTwips, height: t.page.heightTwips },
          margin: { top: t.page.marginTwips, right: t.page.marginTwips, bottom: t.page.marginTwips, left: t.page.marginTwips },
        },
      },
      children: paragraphs,
    }],
  });
  return Packer.toBlob(doc);
}

// Build & download the .docx. `tokens` is optional so the QA loop can re-render
// with lever-adjusted spacing.
export async function downloadDocx(resumeMd: string, baseName = 'tailored-resume', tokens: RenderTokens = defaultTokens): Promise<void> {
  const blob = await buildResumeDocx(resumeMd, tokens);
  triggerDownload(blob, `${safeName(baseName)}.docx`);
}

// ── PDF (deterministic, in-browser, vector) ──────────────────────────────────
// pdf-lib lays the same parsed blocks out with the same tokens. It uses the
// built-in Helvetica standard font (no embedding, no bundle cost) as a stand-in
// for Calibri — see skills/resume-render/SKILL.md for the fidelity tradeoff.

const PT = 72;                 // points per inch
const PAGE_W = 612;            // US Letter, points
const PAGE_H = 792;
const BULLET_INDENT = 14;      // hanging indent for bullet text, points

// Twentieths-of-a-point (docx-native) → points.
function twips20ToPt(v: number): number { return v / 20; }

// Latin-1 only: Helvetica's WinAnsi encoding throws on characters it can't map,
// so normalize smart punctuation to ASCII and drop anything outside the range.
function pdfSafe(s: string): string {
  return s
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '');
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Greedy word-wrap of styled runs into lines, honoring per-run bold widths.
function wrapRuns(
  runs: StyledRun[],
  regular: { widthOfTextAtSize(t: string, s: number): number },
  bold: { widthOfTextAtSize(t: string, s: number): number },
  size: number,
  maxWidth: number,
): StyledRun[][] {
  const words: StyledRun[] = [];
  for (const r of runs) {
    for (const part of pdfSafe(r.text).split(/(\s+)/)) {
      if (part === '') continue;
      words.push({ text: part, bold: r.bold });
    }
  }
  const widthOf = (w: StyledRun) => (w.bold ? bold : regular).widthOfTextAtSize(w.text, size);
  const lines: StyledRun[][] = [];
  let cur: StyledRun[] = [];
  let curW = 0;
  for (const w of words) {
    const isSpace = /^\s+$/.test(w.text);
    const ww = widthOf(w);
    if (!isSpace && curW + ww > maxWidth && cur.length) { lines.push(cur); cur = []; curW = 0; }
    if (isSpace && cur.length === 0) continue; // no leading space on a wrapped line
    cur.push(w);
    curW += ww;
  }
  if (cur.length) lines.push(cur);
  return lines;
}

// Produce a real vector .pdf Blob laid out from the parsed blocks + tokens.
export async function generatePdf(resumeMd: string, _baseName = 'tailored-resume', tokens: RenderTokens = defaultTokens): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const t = tokens;
  const blocks = parseBlocks(resumeMd);

  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = t.page.marginInches * PT;
  const contentW = PAGE_W - margin * 2;
  const [br, bg, bb] = hexToRgbTuple(t.colors.body);
  const [nr, ng, nb] = hexToRgbTuple(t.colors.sectionHeader);
  const bodyColor = rgb(br, bg, bb);
  const navyColor = rgb(nr, ng, nb);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - margin;
  const newPage = () => { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - margin; };
  const need = (h: number) => { if (y - h < margin) newPage(); };

  // Draw a set of runs as wrapped lines at the left margin.
  const drawRuns = (runs: StyledRun[], size: number, lineHeight: number, indent = 0, marker?: string) => {
    const lines = wrapRuns(runs, regular, bold, size, contentW - indent);
    lines.forEach((line, li) => {
      need(lineHeight);
      const baseline = y - size;
      if (marker && li === 0) page.drawText(marker, { x: margin, y: baseline, size, font: regular, color: bodyColor });
      let x = margin + indent;
      for (const seg of line) {
        const f = seg.bold ? bold : regular;
        page.drawText(seg.text, { x, y: baseline, size, font: f, color: bodyColor });
        x += f.widthOfTextAtSize(seg.text, size);
      }
      y -= lineHeight;
    });
  };

  for (const b of blocks) {
    if (b.type === 'h1') {
      const size = 20;
      need(size + 6);
      page.drawText(pdfSafe(stripInline(b.text)), { x: margin, y: y - size, size, font: bold, color: bodyColor });
      y -= size + 4;
    } else if (b.type === 'h2') {
      y -= twips20ToPt(t.spacing.sectionBefore);
      const size = 12;
      need(size + 10);
      const label = t.sectionHeader.allCaps ? pdfSafe(stripInline(b.text)).toUpperCase() : pdfSafe(stripInline(b.text));
      page.drawText(label, { x: margin, y: y - size, size, font: bold, color: navyColor });
      y -= size + 3;
      if (t.sectionHeader.bottomBorder) {
        page.drawLine({ start: { x: margin, y }, end: { x: PAGE_W - margin, y }, thickness: 0.75, color: navyColor });
      }
      y -= 6;
    } else if (b.type === 'h3') {
      const size = 11;
      const { main, date } = splitTrailingDate(b.text);
      y -= twips20ToPt(t.spacing.jobBefore);
      // keepNext: reserve room for the header AND at least one following line so a
      // job heading never orphans at the bottom of a page.
      need(size + 4 + 14);
      const baseline = y - size;
      let x = margin;
      for (const seg of inlineRuns(main)) {
        const txt = pdfSafe(seg.text);
        page.drawText(txt, { x, y: baseline, size, font: bold, color: bodyColor });
        x += bold.widthOfTextAtSize(txt, size);
      }
      if (date) {
        const d = pdfSafe(date);
        const dw = regular.widthOfTextAtSize(d, size);
        page.drawText(d, { x: PAGE_W - margin - dw, y: baseline, size, font: regular, color: bodyColor });
      }
      y -= size + 4;
    } else if (b.type === 'li') {
      const size = 11;
      const lh = Math.max(size * 1.15, twips20ToPt(t.spacing.bulletLine));
      drawRuns(inlineRuns(b.text), size, lh, BULLET_INDENT, '•');
      y -= twips20ToPt(t.spacing.bulletAfter);
    } else {
      drawRuns(inlineRuns(b.text), 11, 13.5);
      y -= 2;
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

// Build & download the .pdf with the same safeName convention as the .docx.
export async function downloadPdf(resumeMd: string, baseName = 'tailored-resume', tokens: RenderTokens = defaultTokens): Promise<void> {
  const blob = await generatePdf(resumeMd, baseName, tokens);
  triggerDownload(blob, `${safeName(baseName)}.pdf`);
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

// LEGACY fallback only — `generatePdf`/`downloadPdf` is the primary PDF path now.
// Opens the styled resume in a new window and triggers the browser print dialog
// (the user picks "Save as PDF"). Kept for pop-up-independent recovery.
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
