# Track 4 — User Profile (hard rules) + Prompt Manager page

Status: **service/pipeline + UI wiring DONE, verified via lint/test; NOT browser-verified**
Last updated: 2026-07-20

Full spec: docs/CLAUDE-CODE-HANDOVER.md § Track 4. Paused here at the user's request —
resume with Track 5 next (dev-workflow skills + final verification).

## Done

### 1. User Profile
- `src/lib/userProfile.ts` — `UserProfile` shape exactly per the handover
  (`seniorityLevel`, `yearsExperience`, `compFloor{amount,currency,per,byWorkModel?}`,
  `workModels[]`, `locations[]`, `targetTracks[]`, `neverClaim[]`, `dealbreakers[]`),
  `EMPTY_USER_PROFILE`, `normalizeUserProfile()` (defensive merge/sanitize — drops
  invalid enum values, non-string array entries, bad `compFloor.per`), `isEmptyUserProfile()`.
- `lib/server/pipelines/profileExtract.ts` + `api/resume/profile-extract.ts` — one-shot
  BYOK extraction via `callLLMStructured` (Track 3's structured-output infra). Only
  extracts what a CV can actually support: seniority, years, work-model/location/
  target-track hints. Comp floor, never-claim, dealbreakers are explicitly NOT
  extracted (not derivable from a CV) — always left for the user. Registered in
  `server/dev-api.ts`. Client: `apiClient.extractUserProfile()`.
- Persistence — follows `masterResumeService`/`useMasterResume` exactly: `src/lib/
  userProfileService.ts` (Supabase CRUD, one current row, jsonb `content`) +
  `src/hooks/useUserProfile.ts` (localStorage always, debounce-saved to cloud when
  signed in). Migration: `supabase/migrations/20260720000000_user_profile.sql` — new
  `user_profile` table, RLS mirroring `resume_instructions`. **Not yet applied to any
  live database** — this is a schema change to shared infrastructure, so it was left
  for the user to run explicitly (`npm run db:migrate:sql supabase/migrations/
  20260720000000_user_profile.sql`) rather than applied automatically.
- UI: `src/components/UserProfileEditor.tsx` — "Extract from master CV" (provider
  picker + BYOK), then a form for every hard-rule field (seniority select, years
  number, work-model toggle chips, comp floor amount/currency/per, and comma-separated
  inputs for locations/targetTracks/neverClaim/dealbreakers). Wired into the sidebar
  as a new "Screening Rules" nav item (`ViewKey = 'profile'`).

### 2. Prompt Manager
- `src/lib/promptDefaults.ts` — `PROMPT_REGISTRY` (4 entries: tailoring, visualQaRules,
  researchBrief, coverEmail) with shipped defaults, `resolvePrompt(default, override)`
  (override wins iff non-blank after trim). Tailoring instructions keep their existing
  `resume_instructions` table/`useInstructions` hook (predates this track, already
  works — not migrated to avoid a data-migration for existing users). The other three
  persist through a new shared table.
- `supabase/migrations/20260720000000_user_profile.sql` also creates `prompt_overrides`
  (one row per `(userId, prompt_key)`, RLS-scoped) — same migration file as User
  Profile since both were designed together; **also not yet applied**.
- `src/lib/promptOverridesService.ts` + `src/hooks/usePromptOverrides.ts` — Supabase
  CRUD (fetchAll/save-upsert/reset-delete) + localStorage-mirrored hook, explicit
  per-field save (not debounced — Prompt Manager saves are deliberate button presses).
- **Research-brief prompt is actually wired**, not just registered: added
  `JdParseInput.researchPromptOverride` → `lib/server/pipelines/jdParse.ts`'s
  `enrichViaGrounded` layers it on top of the built-in JSON-contract prompt (same
  "user instructions layer on top, server contract stays authoritative" pattern
  `api/resume/tailor.ts` already used) → threaded through `api/jd/parse.ts` and
  `apiClient.parseJd()`. **Cover-email prompt is intentionally NOT wired** — no
  cover-email generator exists in this app yet; the registry marks it `wired: false`
  and the Prompt Manager UI shows a visible "not yet wired" badge rather than
  pretending a feature exists. Visual-QA rules were already override-capable
  (`runVisualQa`'s `rulesPrompt` param, Track 3) — `ResumeBuilder.tsx` now reads the
  stored override via `usePromptOverrides` and passes it through.
- UI: `src/components/PromptManager.tsx` — one card per registry entry: description,
  Default/Custom badge, textarea, "Reset to default" (disabled when already default),
  "Save" (disabled until dirty), last-edited timestamp for override-storage prompts.
  Wired into the sidebar as "Prompt Manager" (`ViewKey = 'prompts'`).

### 3. Triage integration (deferred item from Track 3, closed out here)
- `src/lib/triage.ts` — client-side twin of `lib/server/triage.ts` (duplicated
  deliberately, not imported across the `src/` ↔ `lib/server/` boundary — same
  reasoning `atsCheck.ts` already documents for its own client-side logic; triage is
  pure/no-I/O so duplication risk is low and the two have parallel test suites).
- Wired into `src/components/NewApplicationModal.tsx`: `useUserProfile(user)` feeds
  `runTriage` against the live form fields (memoized). A flagged JD shows a banner
  with the specific reasons and disables both spend actions — "Research company" and
  "Score match" — until the user clicks "Proceed anyway" (which resets automatically
  if the underlying flag reasons change, so acknowledging one flag doesn't silently
  bypass a different one later). `NewApplicationModal` gained an optional `user` prop,
  wired from `App.tsx`.
- **ResumeBuilder's tailor-time triage gate remains deferred** — ResumeBuilder has no
  structured JD fields (it takes raw pasted `jdText` straight into `tailorResume`,
  never runs JD parsing), so there's nothing to triage against without first adding a
  JD-parse step there. Out of scope for this pass; `NewApplicationModal` is where the
  "before research/tailor spend" rule is genuinely actionable today.

## Tests (all passing — `npm run lint && npm test`: 123 passed, 1 pre-existing skip)
- `src/lib/userProfile.test.ts` — `normalizeUserProfile` sanitization (invalid enum
  values, non-string entries, bad `compFloor.per`, null/undefined/garbage input),
  `isEmptyUserProfile`.
- `lib/server/pipelines/profileExtract.test.ts` — structured-call request shape
  (schema sent matches `PROFILE_EXTRACT_SCHEMA`), enum/type filtering of a
  hallucinated response, all-empty-defaults fallback when the call fails.
- `src/lib/userProfileService.test.ts` / `src/lib/promptOverridesService.test.ts` —
  "unit-test the service mapping" (the handover's explicit fallback — no existing
  supabase-mock convention in this repo): not-configured no-op paths, query/upsert
  shapes, insert-vs-update branching. Mocks `../supabaseClient` directly so these
  tests never hit a real network endpoint regardless of local `.env` contents
  (confirmed: this repo's `.env` has real Supabase credentials, which vitest/Vite
  would otherwise load into `import.meta.env` — mocking the module boundary was
  necessary, not just tidy).
- `src/lib/promptDefaults.test.ts` — `resolvePrompt` resolution order (override wins
  iff non-blank after trim; undefined/null/whitespace-only all fall back to default),
  registry shape sanity.
- `src/lib/triage.test.ts` — lighter integration-style suite for the client copy
  (full rule matrix already covered by `lib/server/triage.test.ts`); confirms the
  client copy behaves identically and integrates with a `UserProfile`-shaped object.
- `lib/server/pipelines/jdParse.test.ts` gained one more test: `researchPromptOverride`
  appears in the sent prompt under "ADDITIONAL USER RESEARCH FOCUS" alongside the
  built-in JSON contract.

## Honesty note on verification
Same caveat as Tracks 2 and 3: everything above is `tsc --noEmit` clean and passes
mocked-network tests, but has **not** been exercised in a real browser session — no
real Supabase migration applied, no real sign-in/sync round-trip, no real BYOK
extraction call, no click-through of the two new sidebar pages. Two follow-ups needed
before this is genuinely done end-to-end:
1. ~~Apply `supabase/migrations/20260720000000_user_profile.sql` to the target database~~
   — **done 2026-07-24**: `user_profile` and `prompt_overrides` tables confirmed live,
   RLS enabled, all 4 policies present on each.
2. A real browser pass: open "Screening Rules", extract from a real master CV, confirm
   triage actually flags/passes in `NewApplicationModal`, open "Prompt Manager", edit
   and reset each prompt, confirm a visual-QA override actually reaches `runVisualQa`.

## Resume notes
Paused here at the user's request after Track 4. Track 5 (dev-workflow skills + final
verification) is next: `skills/dev/add-search-provider/SKILL.md`,
`skills/dev/new-resume-template/SKILL.md`, referenced from `CLAUDE.md`, then a full
`npm run lint` + `npm test` pass, a `git diff` review against the repo rules (BYOK
never logged, no hardcoded companies, glass-panel-only UI), and marking every
`docs/progress/*.md` complete. The two follow-ups above (migration + browser pass)
are also still open and worth doing before Track 5's "final verification" claims
anything is truly done.
