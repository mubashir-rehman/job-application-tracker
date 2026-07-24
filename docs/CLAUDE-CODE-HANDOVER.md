# HireTrack Upgrade — Claude Code Handover

> **Audience:** Claude Code, working in this repo. This document is self-contained — it
> carries everything decided in the Cowork planning session (2026-07-20) plus current state.
> Read alongside: `CLAUDE.md`, `AGENTS.md`, `docs/ORCHESTRATION-UPGRADE-PLAN.md` (the
> architectural plan this executes), and `docs/progress/*.md` (live state per track).

---

## 0. Mission (user's directives, verbatim intent)

1. Add **web-search tool support** to the orchestration layer so research is grounded, "similar
   to what Claude does": use provider-**native** websearch tools where the API has them; build a
   **tool-calling loop** (our own MCP-style execution) for providers that don't.
2. Upgrade the orchestration layer to **reason + tool-call** (multi-turn, thinking enabled).
3. Upgrade **PDF generation with skills-based formatting**, replicating the quality of the
   user's claude.ai "Resume creation" project: versioned design-token skill, deterministic
   render, and a **visual QA loop** — take page screenshots, send to the user's BYOK
   **multimodal** model, validate against **rules that live in a configurable prompt**.
   PDF generation happens **in the browser** (local-first; user preference confirmed).
4. Add a **Prompt Manager page** — every configurable prompt editable in one place.
5. Add a **User Profile** populated from the master resume holding **hard rules** (seniority,
   pay floor, work model, etc.) used to **pre-process/triage job descriptions** before any
   token spend.
6. **Tests for every implementation** — a test suite per track (vitest harness now exists).
7. **Create skills** for repeating dev workflows (see § Track 5).
8. **Process rules:** implementation + testing on **Opus**-class agents; each work unit
   **records progress continuously** to `docs/progress/track-N-*.md` so interrupted work
   resumes losslessly. Work tracks **sequentially** (they share package.json/config files).

## 0b. Research findings this plan is built on (from the claude.ai project)

The user's claude.ai project (id 019f0442-6d95-73e0-a203-5d9e7fea02cb) produces the
reference-quality PDFs. Its observed workflow, to replicate in-app:
triage against standing filters FIRST → web research (native web_search/web_fetch) → read
formatting skill → write .md source of truth → build DOCX from tokens → convert to PDF →
**rasterize pages → visual QA with vision model → apply known spacing levers → rebuild** →
deliver package (resume + cover email + ATS coverage + gap analysis + claims-to-verify +
rationale) → log to tracker via MCP (`check_duplicate` → `add_application`).

The "navy single-column" design tokens (from that project's memory) are the template to encode:
Calibri, US Letter, ~0.75in margins; section headers allCaps + bottom border, color `1F3864`;
links `2E5395`; dates right-tabbed at CONTENT_WIDTH 10080 twips; bold lead-in bullet labels;
`keepNext` on job headers. Page-overflow levers **in order**: bullet spacing.after 60→40→32;
bullet line height 252→240→232; section-header spacing.before 200→150→130; job-header
spacing.before 140→110; remove spacer paragraphs (skills rows tuned separately).

---

## 1. Current state (verified 2026-07-20)

### DONE — Track 1: websearch orchestration (code complete; tests authored, NOT yet executed)
See `docs/progress/track-1-websearch.md`. Summary:
- Vitest harness: `vitest.config.ts`, `npm test`/`test:watch`, vitest ^4 devDep.
- `lib/server/llm.ts`: `SearchResult` + `grounded`/`via`; native search — Anthropic
  `web_search_20250305` server tool, OpenAI Responses API `web_search` (+`url_citation`
  parsing), Gemini `google_search` (pre-existing).
- `lib/server/agent.ts`: `runSearchAgent` multi-turn loop, both dialects (Anthropic
  tool_use/tool_result; OpenAI-compatible tool_calls/role:"tool"); local tools `web_search`
  (serper) + `fetch_url`; max 5 turns; sources dedupe; `groundedCall` fallback ladder
  native → loop → ungrounded (no user-facing 400s).
- `lib/server/pipelines/jdParse.ts` enrich routed through `groundedCall`.
- 25 tests in `lib/server/llm.test.ts` + `lib/server/agent.test.ts` (all fetch mocked).

**FIRST ACTION for Claude Code:** `npm install && npm run lint && npm test` — fix anything
red (the Cowork sandbox VM died before tests could run). Also sanity-check the OpenAI
Responses API and Anthropic web-search response shapes against current docs.

### NOT STARTED
Tracks 2–5 below. `docs/progress/track-2-render.md` exists as a stub.

---

## 2. Execution protocol (applies to every track)

- **Sequential tracks**, order: 2 → 3 → 4 → 5 (Track 1 verification first).
- **Progress file per track** (`docs/progress/track-N-<name>.md`): status line, Done, Remaining,
  Resume notes. Update **as each file lands**, not at the end. Format: see track-1 file.
- **Gates per track:** `npm run lint` (tsc --noEmit) and `npm test` green before the track is
  called done. Add tests IN the track, not deferred.
- Repo rules (AGENTS.md, non-negotiable): BYOK keys never stored/logged (headers only);
  no provider SDKs — plain fetch; no hardcoded company/user specifics in logic;
  glass-panel utilities for all new UI (no hardcoded slate backgrounds); `@` alias = repo
  root; phases array always 7; `currentStatus` only via `deriveCurrentStatus`;
  prefer Edit over rewrite; keep files focused.
- Naming for generated resume files: `Mubashir-Rehman_<Company>_<Role>.<ext>` (configurable
  candidate name — no hardcoding in logic; it comes from the master CV/profile).

---

## 3. Track 2 — Resume-render skill (tokens + DOCX + browser PDF + rasterizer)

**Goal:** formatting as versioned data ("skill"), deterministic artifacts, QA-ready.

1. **`skills/resume-render/tokens.json`** — the navy tokens from § 0b, machine-readable:
   fonts (primary Calibri, fallback Carlito/Helvetica/Arial), page (US Letter, 0.75in margins),
   colors (`sectionHeader: 1F3864`, `link: 2E5395`, body `1a1a1a`), sectionHeader
   (allCaps, bottomBorder), dates right-tab at 10080 twips, bullets (bold lead-in),
   pagination (keepNext on job headers), spacing (bulletAfter 60, bulletLine 252,
   sectionBefore 200, jobBefore 140), and `overflowLevers`: **ordered** array of
   `{ id, target, property, steps[] }` exactly per § 0b lever order.
2. **`skills/resume-render/SKILL.md`** — when to use, token semantics, render workflow
   (md → blocks → docx/pdf), lever ordering, and a **"Visual QA rubric" section**: the
   DEFAULT configurable rules prompt for the visual QA loop. Written as instructions to a
   multimodal model reviewing rasterized pages: orphaned job headings at page bottom,
   overflow to page 3, cramped/uneven spacing, widowed bullets, misaligned right-tab dates,
   awkward section splits, token conformance (fonts/colors); output STRICT JSON:
   `[{issue, severity: "high"|"medium"|"low", lever: <lever id|null>, note}]`.
3. **DOCX upgrade** in `src/lib/resumeRender.ts` (keep existing exports + md block parser):
   `downloadDocx` applies full token set — Calibri, page size/margins, h2 allCaps + bottom
   border + 1F3864, h3 keepNext, right-tab dates (detect trailing date patterns in h3/p,
   docx `TabStopType.RIGHT` @ 10080), token-driven spacing. Accept optional `tokens` param
   (default = imported tokens.json) so lever adjustments can re-render.
4. **Browser PDF** — replace print-dialog as primary path: `generatePdf(resumeMd, baseName,
   tokens?)` → vector PDF Blob, laid out from the same blocks + tokens. Implementation:
   prefer `pdfmake` (declarative layout; lazy-import like docx); Carlito font if practical,
   else Helvetica — document tradeoff in SKILL.md. Keep `printPdf` as legacy fallback.
   `downloadPdf` uses the safeName convention.
5. **Rasterizer** `src/lib/pdfRaster.ts`: `rasterizePdf(pdfData, {scale?, maxPages?})` →
   JPEG data-URL per page via `pdfjs-dist` (already a dep — reuse the worker setup pattern
   from `src/lib/resumeImport.ts`). This feeds Track 3's QA loop.
6. **Tests:** tokens schema (levers ordered, hex colors); docx XML assertions (unzip, assert
   Calibri/1F3864/keepNext/right-tab@10080); PDF smoke (starts `%PDF`, 1–2 pages, pdfjs
   `getTextContent` contains fixture name + a heading); rasterizer logic with pdfjs mocked
   (node canvas unreliable — skipIf). DOM-touching tests: `// @vitest-environment jsdom`.

## 4. Track 3 — Triage + research brief + structured outputs + visual QA loop

1. **Triage** (`lib/server/triage.ts` + client wiring): pure function screening a parsed JD
   against the User Profile hard rules (Track 4 defines the shape; build against the
   interface now): seniority band, comp floor, work model, location, excluded stacks.
   Output: `{ verdict: 'pass'|'flag', reasons[] }`. UI: before research/tailor spend,
   flagged JDs require explicit "proceed anyway". (This is the claude.ai project's learned
   "JOB-POST TRIAGE RULE" — screen BEFORE any web search or deep reasoning.)
2. **Research brief**: expand jdParse enrich output into a structured brief — product,
   eng culture, stack signals, news, "what they do matching real experience but not in the
   JD" — via `groundedCall`. Feed into `/api/jd/score` and `/api/resume/tailor` prompts as
   **context, never claimable facts** (truth remains master-CV-only). Surface `sources[]`
   + `via` badge in UI. Cache brief per company (localStorage).
3. **Structured outputs**: replace `safeJson` string-slicing in score/jdParse with provider
   structured-output modes — Anthropic tool-forcing, OpenAI `response_format: json_schema`,
   Gemini `responseSchema`; keep safeJson as last-resort fallback.
4. **Visual QA loop** (`src/lib/visualQa.ts` + ResumeBuilder wiring):
   `runVisualQa({ pages: string[] (JPEG data URLs), rulesPrompt, provider, apiKey, model })`
   → sends images via each provider's vision dialect (Anthropic image blocks / OpenAI
   image_url / Gemini inlineData) → parses strict-JSON issues → maps `lever` ids to token
   mutations (Track 2 `overflowLevers`) → re-render → re-check, **max 3 iterations**.
   Rules prompt: default from SKILL.md rubric, user-overridable (Prompt Manager, Track 4).
   Uses the user's BYOK key; if the selected provider/model has no vision support, degrade
   gracefully (deterministic checks only + notice).
   Deterministic pre-checks first (free): page count, `atsCheck.ts` linearization + keyword
   coverage, min font size.
5. **Tests:** triage matrix (each rule pass/flag); brief prompt assembly + schema; structured
   output request shapes per provider; QA loop with mocked vision responses (issue→lever
   application, iteration cap, malformed JSON handling, no-vision degradation).

## 5. Track 4 — User Profile (hard rules) + Prompt Manager page

1. **User Profile**: structured hard rules **extracted from the master CV by LLM once**
   (BYOK), then user-editable: `{ seniorityLevel, yearsExperience, compFloor: {amount,
   currency, per, byWorkModel?}, workModels[], locations[], targetTracks[],
   neverClaim: string[] (excluded stacks/claims), dealbreakers[] }`.
   Persistence: localStorage mirror + Supabase (follow `masterResumeService`/
   `useMasterResume` pattern exactly — new `user_profile` table + migration under
   `supabase/migrations/`, RLS like existing tables). Feeds Track 3 triage.
2. **Prompt Manager page**: new sidebar surface listing every configurable prompt:
   tailoring instructions (today a single field — migrate into this page), visual-QA rules,
   research-brief prompt, cover-email prompt. Each: shipped default (versioned in repo,
   e.g. `docs/prompts/` or `skills/`), user override, "reset to default", last-edited.
   Server OUTPUT contracts stay authoritative (same pattern as `/api/resume/tailor`'s
   instructions layering today). Glass-panel design system; follow existing hook patterns
   (`useInstructions` is the precedent — read it first).
3. **Tests:** profile schema + extraction prompt assembly + persistence round-trip (mock
   supabase like existing patterns if any, else unit-test the service mapping); triage
   integration (profile → triage rules); prompt resolution order (override > default).

## 6. Track 5 — Dev-workflow skills + final verification

1. Repo skills for repeating workflows:
   - `skills/dev/add-search-provider/SKILL.md` — steps to add a provider to llm.ts/agent.ts
     (dialect choice, native-search support table, required tests, BYOK rules).
   - `skills/dev/new-resume-template/SKILL.md` — how to add a template: tokens file,
     renderer expectations, QA-rubric additions, tests.
   - Reference both from CLAUDE.md (short section).
2. Final verification: full `npm run lint` + `npm test`; `git diff` review against repo
   rules (no BYOK leaks into logs, no hardcoded companies, UI uses glass-panel); update
   `task.md` change log per its format; every `docs/progress/*` marked complete.

---

## 7. Deliberately out of scope (decided in session)

- Serverless/headless-chromium PDF rendering (browser-only chosen; revisit later behind a flag).
- LibreOffice conversion (not feasible on Vercel functions).
- MCP-client consumption inside the serverless functions (A3 in the plan doc — later).
- Sending applications / outreach automation (approval-gated design in docs/PIPELINE.md).
