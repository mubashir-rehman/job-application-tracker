# Track 2 — Resume-render skill tokens + DOCX/PDF renderers

Status: **DONE — verified green**
Last updated: 2026-07-20

The handover doc's "NOT STARTED" stub was stale — this session found the track already
fully implemented in the working tree (present as uncommitted/untracked changes) and
verified it against the full §3 spec rather than rebuilding from scratch.

## Done
- `skills/resume-render/tokens.json` — navy-single-column tokens: fonts (Calibri/Carlito
  fallback/Helvetica PDF substitute), page (Letter, 0.75in margins, 10080-twip content
  width), colors (`1F3864` header, `2E5395` link, `1a1a1a` body), sectionHeader (allCaps +
  bottomBorder + right-tab dates @ 10080), bullets (bold lead-in), pagination (keepNext),
  spacing (bulletAfter 60/bulletLine 252/sectionBefore 200/jobBefore 140), and the 5
  ordered `overflowLevers` exactly per § 0b (bulletAfter → bulletLine → sectionBefore →
  jobBefore → removeSpacers).
- `skills/resume-render/SKILL.md` — token semantics table, render workflow (md → blocks →
  docx/pdf), overflow-lever ordering, and the full **Visual QA rubric** (strict-JSON output
  contract `[{issue, severity, lever, note}]`) that Track 3's visual-QA loop consumes as its
  default configurable rules prompt. Also documents the PDF font tradeoff (Helvetica via
  pdf-lib, not Carlito/pdfmake — see below).
- `src/lib/resumeRender.ts`: `buildResumeDocx`/`downloadDocx` apply the full token set
  (Calibri via docDefaults, page size/margins, h2 allCaps+navy+bottom border, h3 keepNext +
  right-tabbed date via `TabStopType.RIGHT`@10080, token-driven bullet/section/job spacing).
  Both `downloadDocx` and the new `generatePdf`/`downloadPdf` accept an optional `tokens`
  param (default = imported `tokens.json`) so the QA loop can re-render with lever-adjusted
  spacing without touching code.
- **Browser PDF** (`generatePdf`/`downloadPdf`): implemented with **`pdf-lib`**, not
  `pdfmake` as the handover suggested — a deliberate, documented deviation (SKILL.md "PDF
  font tradeoff" section): pdf-lib was already a project dependency, needs no additional
  font bundling, and produces a real vector `%PDF-` Blob laid out from the same shared
  `parseBlocks` block list and tokens as the DOCX path (wrapping, right-tab dates, section
  rules, pagination). `printPdf` (browser print dialog) is retained as a legacy fallback,
  wired in `ResumeBuilder.tsx` (`downloadPdfMd` tries `downloadPdf` first, falls back to
  `printPdf` on failure).
- `src/lib/pdfRaster.ts`: `rasterizePdf(pdfData, { scale?, maxPages? })` → JPEG data-URL
  per page via `pdfjs-dist`, reusing the lazy-import + worker-URL pattern from
  `resumeImport.ts`. Feeds Track 3's QA loop.
- UI wiring: `ResumeBuilder.tsx` imports `downloadPdf` alongside `downloadDocx`; the PDF
  button now downloads the deterministic vector PDF as the primary path.
- **Tests** (all passing, see verification below):
  - `src/lib/resumeTokens.test.ts` — schema completeness, hex color format, page geometry
    (US Letter/0.75in/10080 twips), spacing keys numeric, overflowLevers ordered with
    expected ids/shape, numeric levers non-increasing and starting at the live default.
  - `src/lib/resumeRender.test.ts` — `splitTrailingDate` unit cases; `buildResumeDocx` XML
    assertions via JSZip unzip (Calibri in styles.xml, `1F3864`, `<w:keepNext`,
    `w:pos="10080"` + right tab); lever-adjusted re-render smoke test; `generatePdf` smoke
    test (`%PDF-` magic bytes, 1–2 pages via pdf-lib reload, text extraction contains name +
    upper-cased section header).
  - `src/lib/pdfRaster.test.ts` — page-iteration logic with `pdfjs-dist` mocked (maxPages
    cap, under-cap page count, Blob input path); real-canvas end-to-end path is
    `describe.skipIf`'d in Node (documented, matches the plan's "node canvas unreliable —
    skipIf" instruction).

## Verification (this session)
- `npm run lint` (tsc --noEmit) — clean.
- `npm test` — 5 files, 34 passed / 1 skipped (the documented real-canvas skip), 0 failed.
- Deps already present for this track: `pdf-lib` (dependency), `jszip` (devDependency, test
  unzip only), `vitest` harness, `resolveJsonModule: true` in `tsconfig.json` (needed for
  the `tokens.json` import).
- Not independently browser-verified in this session (no browser session run) — the DOCX/
  PDF/rasterizer code paths are covered by mocked/Node-side tests only. Real end-to-end
  (open the app, tailor a resume, click .docx/PDF, open the files) has not been re-run here;
  flagging this explicitly per CLAUDE.md's testing-honesty rule rather than claiming a
  browser-verified pass.

## Remaining
None for the spec as written. Optional future polish (not blocking): if exact Calibri
fidelity in the PDF is ever required, bundle Carlito + `@pdf-lib/fontkit` and switch
`tokens.fonts.pdfSubstitute` (SKILL.md already documents this path).

## Resume notes
Track 3 (triage + research brief + structured outputs + visual QA loop) depends on this
track's `tokens.json` (`overflowLevers`), `pdfRaster.ts` (`rasterizePdf`), and the SKILL.md
QA rubric as its default rules prompt — all ready to consume as-is.
