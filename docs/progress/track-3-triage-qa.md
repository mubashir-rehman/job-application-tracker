# Track 3 — Triage + research brief + structured outputs + visual QA loop

Status: **service/pipeline layer DONE, verified green; UI wiring done but NOT browser-verified**
Last updated: 2026-07-20

Full spec: docs/CLAUDE-CODE-HANDOVER.md § Track 3. Depends on Track 2 (tokens.json,
pdfRaster.ts, SKILL.md QA rubric) — all present and consumed as-is.

## Done

### 1. Structured outputs (`lib/server/llm.ts`)
- `safeJsonParse` — extracted as a shared export (was duplicated in `score.ts` and
  `jdParse.ts`); both now import it instead of maintaining their own copy.
- `callLLMStructured({..., schema, schemaName})` — provider-native structured output,
  with `{data, usedStructured}`:
  - **Anthropic**: forces a single tool call whose `input_schema` IS the caller's schema;
    `tool_use.input` arrives already parsed (no string-slicing). Skips `tool_choice`
    forcing when `thinking` is on (Anthropic rejects combining them) — no current caller
    passes `thinking: true` to a structured call, so this is documented-latent, not hit.
  - **OpenAI**: `response_format: {type: 'json_schema', json_schema: {strict:true, ...}}`
    on Chat Completions.
  - **Gemini**: `responseSchema` + `responseMimeType: 'application/json'`. Gemini's
    `responseSchema` is an OpenAPI-3.0 subset, NOT full JSON Schema — it has no
    `type: [...]` nullable union and rejects `null` inside `enum`. Added `toGeminiSchema()`
    (recursive normalizer) that rewrites `type: ['string','null']` → `{type:'string',
    nullable:true}` and strips `null` out of `enum` arrays + sets `nullable:true`. Without
    this, every Gemini structured call against a nullable schema (e.g. `JD_EXTRACT_SCHEMA`,
    where almost every field is nullable) would throw and silently degrade to the
    `safeJsonParse` fallback — caught in this session via advisor review, not the original
    implementation. Now covered by a dedicated regression test.
  - On any provider throw (schema rejected, network error, provider quirk) or for a
    provider with no structured mode (mimo/custom): falls back to plain `callLLM` +
    `safeJsonParse` — callers always get `{data, usedStructured}`, never a throw.
- `score.ts`'s positioning verdict and `jdParse.ts`'s field extraction (`JD_EXTRACT_SCHEMA`)
  both migrated onto `callLLMStructured`.
- `enrichViaGrounded`'s research-brief JSON is deliberately NOT migrated to structured
  mode — it still uses `groundedCall` (native search / agent tool loop) + `safeJsonParse`.
  Structured/tool-forced JSON doesn't compose with those search-tool turns (Anthropic
  server-side search + a forced tool in the same turn conflict; OpenAI's Responses API
  used for native search is a different endpoint than the `response_format: json_schema`
  Chat Completions path) — this is a documented, deliberate exception, not an oversight.

### 2. Research brief expansion (`lib/server/pipelines/jdParse.ts`)
- `JdResearch` gained `productOverview`, `engCulture`, `stackSignals[]`, `recentNews[]`,
  `experienceMatch` alongside the existing `companyWebsite`/`summary`/`marketSalaryHint`.
- `enrichViaGrounded`'s prompt asks for the full structured brief; `experienceMatch` is
  only requested when an optional `masterMd` is supplied (new `JdParseInput.masterMd` /
  `State.masterMd`), and the prompt explicitly scopes the CV excerpt to that field only —
  never used for extraction, never a resume claim, just a suggestion to verify.
- **Enrich routing flipped**: `enrichNode` now prefers the LLM-grounded path whenever an
  apiKey is present (needed — only an LLM can synthesize the narrative fields from search
  results), even if a searchKey is also present; the searchKey still gets used internally
  by the grounded fallback ladder's agent-loop `web_search` tool when the provider has no
  native search. The serper-only path is now purely the keyless-of-LLM fallback (basic
  fields only, no LLM tokens). **Cost-shift note**: a user who previously set a serper key
  specifically to research companies without spending LLM tokens will now get an LLM call
  on every enrich once they also have any apiKey configured (which most users do, for
  tailoring) — this is an intended tradeoff for the richer brief, not an oversight, but
  worth knowing given this project's known tailor-timeout/token-budget sensitivity.
- `formatResearchContext(research)` — shared prompt-formatting helper, exported from
  `jdParse.ts`, used by both `score.ts` and `api/resume/tailor.ts` so the "background
  only, never claimable" framing is identical everywhere.

### 3. Research fed into score + tailor prompts
- `ScoreInput.research` / `api/jd/score.ts` body `research` → appended via
  `formatResearchContext`.
- `api/resume/tailor.ts` body `research` → appended the same way.
- Client (`src/lib/apiClient.ts`): `JdResearch` type expanded to match; `ScoreMatchParams`
  and `TailorParams` both gained `research`; `parseJd`/`ParseJdParams` gained `masterMd`.
- `api/jd/parse.ts` accepts optional `masterMd` in the body, passed through to
  `runJdParse` for `experienceMatch` only.

### 4. Triage (`lib/server/triage.ts`)
- Pure function, no I/O: `runTriage({profile, jd}) → {verdict:'pass'|'flag', reasons[]}`.
- `UserProfileRules` built to the exact shape in handover § Track 4 item 1
  (`seniorityLevel`, `yearsExperience`, `compFloor{amount,currency,per,byWorkModel?}`,
  `workModels[]`, `locations[]`, `targetTracks[]`, `neverClaim[]`, `dealbreakers[]`) —
  Track 4's real `UserProfile` is structurally compatible, no import needed either
  direction.
- 6 rules: seniority-band stretch (±2 ladder steps), comp floor (with per-work-model
  override), work model, location (Remote bypasses), never-claim stacks, free-text
  dealbreaker phrase match. Missing profile/JD data never manufactures a false flag.

### 5. Visual QA loop
- **Server** (`lib/server/pipelines/visualQa.ts` + `api/resume/visual-qa.ts` +
  `lib/server/llm.ts`'s `callLLMVision`): one stateless vision round-trip per QA
  iteration. Anthropic base64 image blocks, OpenAI `image_url` (data URL directly),
  Gemini `inlineData`. `VISION_PROVIDERS = ['anthropic','openai','gemini']`; mimo/custom
  return `{issues:[], supported:false}` without a network call (no vision dialect
  defined). Strict-JSON **array** parsing (`parseIssues`) is separate from
  `safeJsonParse` (object-rooted) since the QA rubric's contract is an array — handles
  fenced/prose-wrapped output and malformed JSON without throwing (empty issue list).
  Registered in `server/dev-api.ts`'s route table (Vercel picks up `api/**` automatically;
  the local Express dev server needs the explicit mount, same as every other endpoint).
- **Client** (`src/lib/visualQa.ts`): `runVisualQa({resumeMd, jdText, tokens?,
  rulesPrompt?, provider, apiKey, model?, maxIterations?})`. Deterministic pre-checks run
  first and always (page count from the rasterized PDF, `atsCheck.ts` score/coverage, a
  minimum-font-size check — currently a no-op pass since the renderer's body size isn't
  token-driven yet, kept so a future token-driven font size is automatically covered).
  Then up to `maxIterations` (default 3) rounds: rasterize current PDF → POST
  `/api/resume/visual-qa` → take the highest-priority issue with a non-null `lever` →
  advance that lever one step on a **cloned** tokens object (`applyLever`, matches
  `tokens.json`'s `overflowLevers` order) → re-render (`generatePdf`) → re-rasterize →
  re-check. Stops early on a clean pass, no actionable lever, or a lever being exhausted
  (`removeSpacers` isn't numeric — the current renderer doesn't emit spacer paragraphs at
  all, so this lever is a documented no-op today, matching Track 2's SKILL.md). Degrades
  to `{degraded:true, notice}` — deterministic checks still returned — when the provider
  has no vision support or the vision call throws; never throws to the caller.
  `DEFAULT_VISUAL_QA_RUBRIC` is a verbatim TS-string copy of Track 2's SKILL.md rubric
  block (SKILL.md stays the prose source of truth; this is the code-usable default,
  mirroring the existing `DEFAULT_INSTRUCTIONS` pattern) — Track 4's Prompt Manager will
  offer it as the overridable default.
- **UI wiring** (`src/components/ResumeBuilder.tsx`): a "Visual QA" panel under the ATS
  check, gated on having a tailored result + a configured key. Shows deterministic checks
  always; on a vision pass, either "no defects" or the per-iteration issue list with
  severity + which lever fixed it, plus a "Download QA-adjusted PDF" button
  (`qaResult.finalPdf`). Resets on each new tailor generation.
- **Research-brief plumbing wired end-to-end**: `NewApplicationModal.tsx`'s existing
  "Check match" (`scoreMatch`) call now forwards the already-fetched `research` state as
  context. Added `src/lib/researchCache.ts` (24h localStorage cache keyed by normalized
  company name) per the handover's "Cache brief per company" instruction, wired into
  `handleResearch` (checks cache before calling `/api/jd/parse`, writes on success).

## Deliberately deferred to Track 4
- **Triage's "proceed anyway" gate**: `runTriage` is ready to call, but there is no real
  `UserProfileRules` data source yet — Track 4 owns the User Profile hook/persistence.
  Wiring a triage gate against an empty/stub profile now would always pass and add no
  real value; it naturally belongs where the profile data lives. Will wire in Track 4.
- **ResumeBuilder's `research` → `tailorResume`**: the server/type plumbing is ready
  (`TailorParams.research`, `api/resume/tailor.ts` accepts it), but ResumeBuilder itself
  has no "research this company" trigger the way `NewApplicationModal` does — building
  one now would duplicate that flow. Revisit once Track 4's Prompt Manager / profile work
  touches ResumeBuilder, or as a small follow-up.
- **Visual QA rules-prompt override**: `runVisualQa`'s `rulesPrompt` param already accepts
  an override; the Prompt Manager UI to actually set one is Track 4's deliverable.

## Tests (all passing — `npm run lint && npm test`: 92 passed, 1 pre-existing skip)
- `lib/server/llm.test.ts`: +20 tests — `safeJsonParse`, `callLLMStructured` per provider
  (request shapes, tool-forcing, thinking/tool_choice mutual exclusion), fallback ladder
  (unsupported provider, thrown structured call, unparseable fallback text), and the
  Gemini nullable-schema regression test.
- `lib/server/pipelines/score.test.ts` (new): keyless coverage path (no fetch call),
  structured verdict request shape, research-context prompt assembly, malformed-response
  fallback.
- `lib/server/pipelines/jdParse.test.ts` (new): keyless deterministic path, structured
  extraction request shape + fallback-on-throw, enrich routing (apiKey-first even with a
  searchKey present → grounded path with the full brief; searchKey-only → serper path,
  basic fields only).
- `lib/server/triage.test.ts` (new): full rule matrix — one test per rule pass/flag,
  byWorkModel override, Remote bypassing location, multi-reason accumulation, empty
  profile.
- `lib/server/pipelines/visualQa.test.ts` (new): no-vision degradation (mimo/custom, no
  fetch call), all 3 vision dialects' request shapes, strict-JSON array parsing incl.
  fenced/prose-wrapped and malformed input, severity/lever defaulting, provider error
  handling, empty-images short-circuit.
- `src/lib/visualQa.test.ts` (new): deterministic checks always computed, clean-pass
  short-circuit, issue→lever application + re-render (tokens actually mutate), lever
  exhaustion, `lever: null` no-op, iteration cap, both degradation paths (unsupported +
  thrown request), rubric contract sanity check. Uses the same pdfjs-dist/fake-canvas
  mocking pattern as `pdfRaster.test.ts`.
- `src/lib/researchCache.test.ts` (new): round-trip, casing/whitespace normalization,
  TTL expiry, blank-company no-op, corrupted-data resilience.

## Honesty note on verification (per CLAUDE.md's testing rule)
Everything above is verified against **mocked** fetch/vision responses and Node-side
rendering — real, not superficial, but not the same as exercising it live. NOT verified
in this session: an actual browser session (dev server, real BYOK keys, a real
Anthropic/OpenAI/Gemini vision call, a real rendered PDF opened and eyeballed). The
ResumeBuilder and NewApplicationModal UI changes compile clean (`tsc --noEmit`) and are
logically wired, but have not been click-tested. Flagging this explicitly rather than
claiming a "verified green" the way Track 2 could — Track 2 has since gained the same
caveat retroactively (see its progress file) since it was never browser-tested either.

## Resume notes
If resuming: this track is functionally complete at the service/pipeline layer. The three
deferred items above are the honest remaining surface, and all three naturally belong in
Track 4 (User Profile + Prompt Manager). Track 4 should wire: (1) the triage gate using
the real profile, (2) a Prompt Manager entry for `DEFAULT_VISUAL_QA_RUBRIC`, and (3)
optionally a "research this company" trigger in ResumeBuilder mirroring
`NewApplicationModal`'s.
