# Track 1 — Websearch orchestration (A1 + A2 + fallback ladder)

Status: **DONE — verified green**
Last updated: 2026-07-20

## Verification (this session)
- `npm install` — clean (4 added, 126 changed, 0 vulnerabilities).
- `npm run lint` (tsc --noEmit) — clean, no errors.
- `npm test` — 5 files, 34 passed / 1 skipped, 0 failed.
- Sanity-checked response shapes against current docs:
  - Anthropic `web_search_20250305` (basic tier, still current) — response is
    `web_search_tool_result` blocks (`content[]` of `web_search_result` with `url`/`title`/
    `page_age`/`encrypted_content`) + `text` blocks with `citations[]` (`url`/`title`/
    `encrypted_index`/`cited_text`). Matches `anthropicSearch()` exactly.
  - OpenAI Responses API `web_search` tool (current type string, not the legacy
    `web_search_preview`) — response is `output[]` with `type: "message"` items whose
    `content[]` holds `output_text` (`text` + `annotations[]` of `type: "url_citation"`
    with `url`/`title`). Matches `openaiSearch()` exactly.
  - Note for later: Anthropic now also offers `web_search_20260209` (dynamic filtering)
    and `web_search_20260318` (response_inclusion control) — not required now, basic tier
    is still fully supported, but worth an upgrade pass in a future track if search-heavy
    token costs become a concern.

## Done
- Vitest harness: `vitest.config.ts` (node env, `lib/**/*.test.ts` + `src/**/*.test.ts`), `npm test` / `npm run test:watch` scripts, vitest ^4 devDep.
- `lib/server/llm.ts`: `SearchResult` extended with `grounded` + `via`; native web search for
  Anthropic (`web_search_20250305` server tool), OpenAI (Responses API `web_search` +
  `url_citation` parsing), Gemini (`google_search`, unchanged). Exports shared internals
  (`DEFAULT_MODEL`, `OPENAI_COMPATIBLE_BASE`, `tokenBudget`, `dedupeSources`) for agent.ts.
- `lib/server/agent.ts`: `runSearchAgent` — multi-turn tool loop, both dialects
  (Anthropic tool_use/tool_result; OpenAI-compatible tool_calls/role:"tool"), local tools
  `web_search` (serper) + `fetch_url` (fetchText), max 5 turns then forced tool-free answer,
  source accumulation + dedupe, tool failures reported to the model as text (never throw).
  `groundedCall` fallback ladder: native → agent loop → ungrounded (`grounded:false`), no 400s.
- `lib/server/pipelines/jdParse.ts`: enrich node routed through `groundedCall`.
- Tests: `lib/server/llm.test.ts` (16) + `lib/server/agent.test.ts` (9) — request shapes,
  parsing fixtures, loop termination, missing-serper path, ladder behavior. All mocked fetch.

## Remaining
None — track complete.

## Resume notes
If resuming: run `npm run lint && npm test` first; fix any type errors in test files against
tsconfig. Callers of `callLLMWithSearch` should migrate to `groundedCall` where a serper key
may be present (grep for both).
