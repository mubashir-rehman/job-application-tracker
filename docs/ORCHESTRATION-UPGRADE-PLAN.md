# Orchestration Upgrade Plan — Web-Search Grounding + Skills-Based PDF Generation

> Source analysis: this repo (`lib/server/llm.ts`, `pipelines/`, `resumeRender.ts`, `atsCheck.ts`)
> plus the claude.ai "Resume creation" project (instructions, memory, and chat traces).
> Status: proposed. Maps to task.md Phase 3 (LLM Integration) and extends Phase 2.

---

## 1. What the claude.ai project does that HireTrack doesn't (yet)

Extracted from the project's instructions/memory and actual chat traces:

| Capability | Claude project behavior | HireTrack today |
|---|---|---|
| Triage first | Screens every posting against standing filters (seniority band, onsite/comp mismatch) BEFORE any search or generation; asks the user how to proceed | No triage stage; user manually decides |
| Web research | Native `web_search` + `web_fetch` to research company, product, eng culture, stack, then feeds it into positioning | Gemini grounding OR serper, only in opt-in JD-parse enrich; tailor/score get zero research |
| Agentic loop | Multi-turn: think → search → read skill → build → inspect → fix → log | Single-shot prompt calls; no tool calling at all |
| Formatting skill | Reads `docx/SKILL.md` before building; applies a versioned house style ("navy single-column" tokens) | Hardcoded CSS in `resumeToHtml()`; generic docx headings |
| Deterministic render | `.md` source → docx-js `build.js` → LibreOffice headless → PDF | docx-js (unstyled) + browser print-dialog PDF (user-dependent, non-deterministic) |
| Visual QA loop | `pdftoppm -jpeg` per page → vision model reviews pages → applies known spacing levers → rebuilds | None |
| Auto-logging | `check_duplicate` → `add_application` via HireTrack MCP after each package | MCP server exists but the app's own builder doesn't log |

---

## 2. Track A — Upgrade the orchestration layer to reason + tool-call

### A1. Provider-native web search (use it where the API has it)

Extend `lib/server/llm.ts` so `callLLMWithSearch` is no longer Gemini-only:

- **Anthropic** — server-side `web_search` tool on the Messages API
  (`tools: [{ type: "web_search_20250305", name: "web_search", max_uses: N }]`).
  Executed by Anthropic; returns citations. No loop needed on our side.
- **OpenAI** — Responses API with the `web_search` tool (or `gpt-4o-search-preview`
  on chat completions). Also executed provider-side.
- **Gemini** — `google_search` grounding (already implemented; keep).
- **MiMo / custom OpenAI-compatible** — no native search → fall through to A2.

Normalize all of these to the existing `SearchResult { text, sources[] }` shape and
delete `SearchUnsupportedError` as a user-facing 400 — unsupported providers should
silently fall back to A2, not error.

### A2. Our own tool-calling loop for providers without native search

New module `lib/server/agent.ts` — a small agentic loop (plain loop or a LangGraph
node, since `@langchain/langgraph` is already a dependency):

1. Declare local tools in each provider's function-calling dialect:
   - `web_search(query)` → backed by `serperSearch()` (already exists)
   - `fetch_url(url)` → backed by `fetchText.ts` (already exists)
2. Send request with tools; if the model returns `tool_use` / `tool_calls`,
   execute locally, append results, repeat (cap: ~5 turns, hard token ceiling).
3. Return final text + accumulated sources.

This gives every provider (including `custom` BYOK endpoints) grounded research with
the keys the user already supplies. Keep reasoning enabled on the loop (the existing
`tokenBudget` split extends naturally to multi-turn).

### A3. MCP as the extensibility path (optional, later)

For providers/tools beyond search: run an MCP client over Streamable HTTP inside the
serverless function and map MCP tools into the same loop. Anthropic's API can attach
remote MCP servers directly (`mcp_servers` connector); for others, our A2 loop is the
MCP adapter. HireTrack already ships an MCP server — the same pattern in reverse.

### A4. Where grounding plugs into the pipeline

- **Stage 2 Research** (exists as jdParse `enrich`): expand from "company website +
  description" to a structured research brief — product, eng culture, stack signals,
  recent news, and "what they do that matches real experience but isn't in the JD"
  (the JD-parroting fix from PIPELINE.md). Cache per company.
- **Stage 3 Score**: pass the research brief so the verdict can flag culture/stack fit.
- **Stage 4 Tailor**: pass the brief for positioning (never as claimable facts —
  truth still comes only from the master CV).
- **Rate note**: market-rate anchoring needs live search (the claude.ai project does
  this in-chat today).
- **Citations**: surface `sources[]` in the UI on every grounded output.

### A5. New: Triage stage (stage 0.5 — cheap, before any spend)

Direct port of the project's learned "JOB-POST TRIAGE RULE": deterministic screen of
the parsed JD against user-stored filters (seniority band, work model, location,
comp floor) → surface mismatches and require an explicit "proceed anyway" before
research/tailor run. Saves tokens and mirrors proven behavior.

### A6. Structured outputs instead of regex JSON scraping

`safeJson()` string-slicing is fragile. Use each provider's structured-output mode
(Anthropic tool-forcing, OpenAI `response_format: json_schema`, Gemini
`responseSchema`) for score/parse stages.

---

## 3. Track B — PDF generation: skills-based formatting + visual QA

### B1. Encode the house style as a versioned "skill"

Create `skills/resume-render/SKILL.md` (+ `tokens.json`) in-repo, holding the design
spec the claude.ai project keeps in memory — so formatting is data, not code:

- Navy single-column: Calibri, US Letter, ~0.75in margins
- Section headers: allCaps, bottom border, color `1F3864`; links `2E5395`
- Dates right-aligned via positional tab (CONTENTW = 10080 twips)
- Bullets with bold lead-in labels; `keepNext` on all job-header paragraphs
- Page-overflow levers, in order: bullet `spacing.after` 60→40→32 → bullet line
  height 252→240→232 → section-header `spacing.before` 200→150→130 → job-header
  `spacing.before` 140→110 → remove spacer paragraphs (skills rows tuned separately)

The tailor/render stages load this skill the way Claude reads `SKILL.md` before
building. Multiple templates become multiple skill folders (navy, ATS-minimal, …).

### B2. One template spec, two renderers

Replace the current split (generic docx + hardcoded print CSS) with a single
`tokens.json` consumed by:

- **DOCX**: upgrade `downloadDocx()` to apply the full token set (docx-js supports
  everything listed: borders, positional tabs, keepNext, spacing).
- **PDF**: make it deterministic instead of the print dialog:
  - **Recommended**: serverless HTML→PDF (`puppeteer-core` + `@sparticuz/chromium`
    on a Vercel function) rendering the same tokens. Vector output, no popups,
    enables the QA loop in B4.
  - Alternative (no new infra): keep client-side, but render via `pdf-lib`/pagedjs
    in-app rather than `window.print()`, so the app owns the bytes.
  - LibreOffice headless (what Claude uses) is off the table on Vercel functions
    (bundle size) unless a container/Cloudflare worker service is added.

### B3. Structured resume content, not markdown regex

`parseBlocks()` line-regexing is the weak link. Move the tailor OUTPUT contract to
structured JSON (name/contact, summary, skills rows, experience[] with role/company/
dates/bullets, projects, education, publications) + keep the markdown for humans.
Rendering from structure eliminates a whole class of layout bugs (and enables the
per-block levers in B1).

### B4. Visual QA loop (the biggest quality unlock)

Mirror Claude's `pdftoppm → view pages → fix` loop in-product:

1. Render PDF → rasterize each page (`pdfjs-dist` is already a dependency — render
   to canvas → JPEG, works client-side; or in the chromium function server-side).
2. Send page images to the user's vision-capable BYOK model with a QA rubric:
   orphaned job headings, content overflowing to page 3, cramped/uneven spacing,
   widowed bullets, misaligned dates, sections split across pages.
3. Model returns structured issues mapped to the known levers from B1
   (e.g. `{ issue: "page overflow 2→3", lever: "bullet spacing.after → 40" }`).
4. Apply levers → re-render → re-check. Cap at 2–3 iterations.
5. Deterministic pre-checks run first (free): page count, `atsCheck.ts`
   linearization + keyword coverage, minimum font size.

### B5. Post-generation contract (parity with the project's per-application package)

Standard deliverables per run: resume `.md/.docx/.pdf` (naming:
`Mubashir-Rehman_<Company>_<Role>.<ext>` — already the project convention), cover
email, ATS keyword coverage, gap analysis, claims-to-verify appendix, tailoring
rationale — then auto-log to the tracker (`check_duplicate` → add) exactly as the
MCP flow does, but in-app.

---

## 4. Other orchestration improvements worth doing

1. **Run traces / observability** — persist per-stage inputs, outputs, sources, and
   model used (LangGraph checkpointing) on the application record; today failures
   are opaque and research is unreproducible.
2. **Research caching** — company briefs keyed by domain; job hunts hit the same
   companies repeatedly.
3. **Honesty Notes as first-class data** — the project treats "Honesty and
   Verification Notes" as overriding the CV body; the tailor prompt should receive
   it as a separate authoritative field, not embedded prose (Knowledge Bank is the
   natural store).
4. **Verification stage** — a second cheap LLM pass diffing tailored claims against
   the master CV (catches overclaiming mechanically instead of trusting one prompt).
5. **Fallback ladder** — provider-native search → serper loop → ungrounded with a
   visible "ungrounded" badge; never a hard 400.
6. **Prompt versioning** — SYSTEM prompts inline in handlers today; move to
   `docs/prompts/` (master-cv.md already lives there) and load at build, so prompt
   iterations are diffable and testable.
7. **Memory loop** — the project appends learned rules to its memory (e.g. the
   triage rule). In-app equivalent: retro/Knowledge-Bank entries feed scoring and
   triage thresholds (already sketched as stage 13 in PIPELINE.md).

---

## 4b. Product surfaces (added)

### Prompt Manager page
All configurable prompts in one editable UI surface, stored per-user (localStorage
mirror + Supabase for signed-in, same pattern as instructions/master resume):
tailoring instructions (exists today as a single field), visual-QA rules prompt,
research-brief prompt, triage messaging, cover-email prompt. Each prompt: default
(shipped in repo, versioned) + user override + "reset to default". The server keeps
its OUTPUT contracts authoritative (same pattern as `/api/resume/tailor` today).

### User Profile for JD pre-processing
A structured profile derived from the master CV (LLM-extracted once, user-editable):
seniority level + years, compensation floor (by currency/work model), acceptable
work models/locations, target tracks, hard skill exclusions (the "never claim" list),
standing dealbreakers. This profile is the input to the triage stage (A5): every
parsed JD is screened against it BEFORE research/tailoring spend, mirroring the
claude.ai project's learned triage rule. Stored like the master resume
(localStorage + Supabase `user_profile` row).

## 5. Suggested build order

| Step | Scope | Effort |
|---|---|---|
| 1 | A1 native search (Anthropic + OpenAI) + fallback ladder | S |
| 2 | A2 serper-backed tool-calling loop for the rest | M |
| 3 | A5 triage stage + A4 research brief into score/tailor | M |
| 4 | B1 skill tokens + B2 docx upgrade (visible quality jump, no infra) | M |
| 5 | B2 serverless PDF + B4 visual QA loop | L |
| 6 | B3 structured resume JSON + A6 structured outputs | M |
| 7 | §4 traces, caching, verification stage | M |
