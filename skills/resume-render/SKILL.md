# Skill: resume-render — "Navy Single Column"

Versioned house style for rendering a tailored resume into an ATS-safe `.docx` and a
deterministic, vector `.pdf`. The design spec lives in `tokens.json` (data, not code) so
the renderers, and the Track 3 visual-QA loop, all read from one source of truth.

- **Spec**: `skills/resume-render/tokens.json`
- **Renderers**: `src/lib/resumeRender.ts` (`downloadDocx`, `generatePdf`/`downloadPdf`)
- **Rasterizer** (QA input): `src/lib/pdfRaster.ts` (`rasterizePdf`)

## When to use

Use this skill whenever a resume is exported to `.docx` or `.pdf`, or when the visual-QA
loop needs to (a) rasterize a rendered PDF into page images, or (b) decide which spacing
lever to pull to fix a layout defect. Do **not** hardcode spacing, colors, or fonts in the
renderers — change `tokens.json` (and bump `version`) instead.

## Token meanings

| Token | Meaning |
|---|---|
| `fonts.primary` | DOCX body font (`Calibri`). |
| `fonts.fallback` | Fallback stack for HTML/preview contexts. |
| `fonts.pdfSubstitute` | Font used by the PDF renderer (`Helvetica`) — see the tradeoff note below. |
| `page.size` / `page.*Twips` | US Letter, 0.75in margins. `contentWidthTwips` (10080) is the usable width and the right-tab position for dates. |
| `colors.sectionHeader` | Navy `1F3864` for `## ` section headings and their bottom rule. |
| `colors.link` | `2E5395` for hyperlinks. |
| `colors.body` | `1a1a1a` default text color. |
| `sectionHeader.allCaps` / `bottomBorder` | Section headers are upper-cased and underlined with a bottom border. |
| `sectionHeader.datesRightAligned` / `tabRightTwips` | Trailing dates on job headers are pushed to the right margin via a positional right tab at 10080 twips. |
| `bullets.boldLeadIn` | `**bold**` lead-in labels at the start of a bullet render as bold runs. |
| `pagination.keepNextOnJobHeader` | Job-header (`### `) paragraphs get `keepNext` so a heading never orphans at the bottom of a page. |
| `spacing.*` | docx-native twentieths-of-a-point. `bulletAfter` = space after a bullet, `bulletLine` = bullet line height, `sectionBefore` = space above a section header, `jobBefore` = space above a job header. |
| `overflowLevers` | Ordered list of spacing reductions the QA loop applies, in order, to pull content back onto the page. |

## Render workflow (md → blocks → docx/pdf)

1. The tailor stage emits constrained resume Markdown (`# name`, `## SECTION`,
   `### Role — Company | Dates`, `- bullet`, paragraphs).
2. `parseBlocks(md)` turns it into a flat `Block[]` (`h1 | h2 | h3 | li | p`). This is the
   single parse both renderers share — never re-parse per renderer.
3. **DOCX** (`downloadDocx`): each block maps to a `docx` `Paragraph` styled from the tokens —
   Calibri default, Letter page + 0.75in margins, `h2` section headers upper-cased + navy +
   bottom border, `h3` job headers with `keepNext` and a right-tabbed date, bullets with bold
   lead-in runs and token spacing.
4. **PDF** (`generatePdf` → `downloadPdf`): the same `Block[]` is laid out with `pdf-lib` onto
   Letter pages, wrapping text against `contentWidth`, drawing section rules, right-aligning
   dates, and paginating with the same spacing intent. Output is a real vector `.pdf` `Blob`.

Both renderers accept an optional `tokens` argument (defaulting to `tokens.json`) so the QA
loop can re-render with lever-adjusted spacing without touching code.

### PDF font tradeoff (why Helvetica, not Calibri)

The PDF path uses `pdf-lib` with the built-in **Helvetica** standard font. Calibri is not a
free/embeddable font and Carlito (its metric-compatible clone) would require bundling a ~350KB
TTF via `fontkit`, inflating the client bundle for a lazy-loaded feature. Helvetica ships inside
every PDF viewer (no embedding, no bundle cost) and is close enough for a clean single-column
layout. The consequence: the PDF's exact line breaks can differ slightly from the DOCX (which
uses Calibri), so treat the two artifacts as visually equivalent, not pixel-identical. If exact
Calibri fidelity is ever required, bundle Carlito + `@pdf-lib/fontkit` and switch
`fonts.pdfSubstitute` — the renderer already reads the font from tokens.

## Overflow-lever ordering

When a rendered resume overflows (or a section is cramped), apply `overflowLevers` **in array
order**, one step at a time, re-rendering and re-checking after each, until the defect clears or
the levers are exhausted (cap ~2–3 iterations):

1. `bulletAfter` — bullet `spacing.after`  60 → 40 → 32
2. `bulletLine` — bullet line height  252 → 240 → 232
3. `sectionBefore` — section-header `spacing.before`  200 → 150 → 130
4. `jobBefore` — job-header `spacing.before`  140 → 110
5. `removeSpacers` — drop empty spacer paragraphs entirely

Each lever's `steps[0]` is the default (matching `spacing`); later entries are the tightened
values. The QA loop maps a reported issue to a lever `id`, advances that lever to its next step,
writes the new value back into the token object's `spacing`, and re-renders.

## Visual QA rubric (DEFAULT configurable rules prompt)

> This block is the shipped default for the Track 3 visual-QA loop. It is a configurable prompt
> (users may override it in the Prompt Manager). It instructs a multimodal model that receives
> the rasterized pages from `rasterizePdf` (JPEG data URLs, one per page, top-to-bottom).

```
You are a meticulous resume layout reviewer. You are given rasterized page images of a
single-column professional resume, in order (page 1 first). The intended house style is:
Calibri/Helvetica body, US Letter with 0.75in margins, single column, navy (#1F3864) UPPERCASE
section headers with a thin bottom rule, job headers with the role/company on the left and the
date range right-aligned to the margin, and concise bullet points with optional bold lead-in
labels. A strong resume fits on 1–2 pages with even, uncramped spacing.

Review the pages and flag layout defects. Check specifically for:
- Orphaned job/section heading stranded alone at the very bottom of a page (its content starts
  on the next page).
- Content overflowing onto a third page when it could reasonably fit on two.
- Cramped or uneven vertical spacing (bullets/lines too tight, or large inconsistent gaps).
- A widowed single bullet or single line left alone at the top or bottom of a page.
- Right-aligned dates that are misaligned, wrapping, or colliding with the role/company text.
- A section awkwardly split across a page break (e.g. header on one page, all bullets on next).
- Fonts or colors that do not match the house style (wrong section-header color, non-navy
  headers, inconsistent body font, headers not uppercased or missing the bottom rule).

For every defect found, choose the single most appropriate spacing lever to fix it, from this
ordered set (prefer earlier levers; use null if no spacing lever applies, e.g. a color/font
mismatch): "bulletAfter", "bulletLine", "sectionBefore", "jobBefore", "removeSpacers".

Respond with STRICT JSON only — an array, no prose, no markdown fence:
[{"issue": "<short description>", "severity": "high" | "medium" | "low", "lever": "<lever id>" | null, "note": "<why / which page>"}]

If the pages look clean, respond with []. Severity guide: high = spills to an extra page or an
orphaned/split heading; medium = cramped spacing or misaligned dates; low = minor cosmetic.
```

## Rasterizer + tokens APIs (for Track 3)

- `rasterizePdf(pdfData: ArrayBuffer | Blob, opts?: { scale?: number; maxPages?: number }): Promise<string[]>`
  — returns one JPEG data URL per page (`data:image/jpeg;base64,...`), capped at `maxPages`
  (default 4), rendered at `scale` (default 2). Browser-only (uses a canvas); lazy-loads
  `pdfjs-dist` with the repo's established worker setup.
- `generatePdf(resumeMd, baseName?, tokens?): Promise<Blob>` — the vector PDF the rasterizer
  consumes. Pass a lever-adjusted `tokens` object to re-render after a QA fix.
- `downloadDocx(resumeMd, baseName?, tokens?): Promise<void>` and
  `downloadPdf(resumeMd, baseName?, tokens?): Promise<void>` — trigger browser downloads.
- Default tokens import: `import tokens from 'skills/resume-render/tokens.json'` (renderers use a
  relative path). Clone before mutating so lever changes don't leak across renders.
