# HireTrack Development Task List

## Project Overview
**HireTrack** — A personal job application tracker with an AI-powered resume builder.

### Two Core Use Cases
1. **Job Application Tracker** — Track applications through a 7-phase interview pipeline
2. **AI Resume Builder (BYOK)** — Generate ATS-optimized resumes using your own LLM API key

### Tech Stack
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion
- **Backend/DB:** Supabase (PostgreSQL + RLS + Auth) — data storage and auth only
- **AI Backend:** Vercel Serverless Functions (Node.js, 60s timeout — runs LangChain)
- **LLM:** LangGraph + LangChain (OpenAI, Anthropic, Google Gemini) — BYOK model
- **Resume Output:** .md, .docx, .pdf
- **Deployment:** Vercel

### Key Paths
- Resume templates: `/home/mubashir/Downloads/resumes` (43 files)
- Master CV: `Mubashir_Rehman_Master_CV_Source_of_Truth_Export.md` in above folder
- Generated output: `generated/` in project root
- Claude commands: `.claude/commands/`
- Project bible: `AGENTS.md`

### BYOK Architecture
```
Browser localStorage → hiretrack_api_keys → POST /api/* with X-API-Key header
Vercel Function → uses key once → calls LLM → returns result → key never stored
```

---

## Consolidated Build Tracks (2026-06-26)

Full designs: **`docs/PIPELINE.md`** (automated application pipeline + local resume source + knowledge bank) and **`docs/DESIGN.md`** (native-experience revamp, desktop-first).

Locked decisions: assisted **with approval gates** · built **into HireTrack (Vercel + Supabase, BYOK)** · **paste JD/URL** intake · **local-first** resume source (FS Access API, replaces disabled Drive).

| Track | Scope | Depends on | Owning skills |
|---|---|---|---|
| **1 — UI (priority)** | D1 tokens + light/dark fix → D2 desktop adaptive shell (3-pane, pipeline rail, ⌘K, keyboard) → D3 migrate views | — | `frontend-design` |
| **2 — Data/AI (parallel)** | `master_resume` + knowledge-bank tables · corrected master-CV prompt · intake/tailor/render/ATS functions | — | `supabase-postgres-best-practices`, `/knowledge-base`, `/resume-generator`, `/document-generator`, `/prompt-manager` |
| **3 — Pipeline UI** | intake → approval gate → tracker + knowledge-bank dashboard, into the new shell | 1 & 2 | `frontend-design` |
| **4 — Mobile + PWA** | D4 PWA → D5 mobile shell (bottom nav, sheets, gestures) → D6 polish/a11y | 1 | `frontend-design` |
| **5 — Pipeline B/C/D** | research/scoring · outreach/verify · follow-up · prep · retro→bank loop · browser-capture · outcome analytics | 3 | `/resume-generator`, `/test-runner`, `/prompt-manager` |

**Map to existing phases:** Track 2 + Track 5 deliver Phase 2–3 (AI Resume Builder + LLM). Track 1/3/4 deliver the Phase 1 dashboard reimagination (D1–D4 items) and clear much of the Phase 1 UI/UX backlog. Track 5 retro→bank loop delivers Phase 4 (personalization).

---

## Phase 0: Codebase Integrity (ACTIVE)

### Logic Errors Fixed (from audit — 20 issues)
- [x] **L1** PerformanceTelemetry hardcoded NVIDIA/Stripe/Airbnb company names → rewrote as generic Pipeline Analytics
- [x] **L2** ApplicationTable tech tags hardcoded by company name → extractTechTags() from keyJdRequirements
- [x] **L3** DetailSlideOver hardcoded preparation resource links (NVIDIA/Stripe specific) → show keyJdRequirements instead
- [x] **L4** data.ts INITIAL_APPLICATIONS contained personal interview data → replaced with generic placeholder companies
- [x] **L5** currentStatus updated only on status field change, not on any phase edit → always recompute via deriveCurrentStatus()
- [x] **L6** currentStatus jumped to last-edited phase, not highest active/completed → fixed derivation logic
- [x] **L7** NewApplicationModal hardcoded currentStatus = 'Application Submitted' → derive from phases
- [x] **L8** Salary parsing broke on "$190,000-$240,000" format (extracted [190,000,240,000]) → parseSalaryMidpoint() handles k-suffix and comma-separated
- [x] **L9** Salary sort used localeCompare (string sort) → numeric sort via parseSalaryMidpoint()
- [x] **L10** PerformanceTelemetry score formula hardcoded for senior engineer (baseline 72, clamp 65-98) → generic 0-100 pipeline efficiency
- [x] **L11** Communication score based on self-rating > 8.5 arbitrary threshold → removed
- [x] **L12** avgSelfRating defaulted to 8.0 biasing score for new users → show N/A when no data
- [x] **L13** Guest users loaded personal mock applications → now starts with empty array
- [x] **L14** Offer detection logic duplicated in StatsGrid + PerformanceTelemetry → shared isOfferReceived() in appUtils
- [x] **L15** activePhaseIndex -1 case silently ignored → handled
- [x] **L16** Multiple browser tabs in guest mode overwrote each other (shared localStorage key) → known limitation, documented
- [x] **L17** phases?.[6]?.status — no check for phases.length === 7 → guarded
- [x] **L18** user typed as `any` → use Supabase User type
- [x] **L19** No PHASE_COUNT constant — phase count assumed everywhere → documented in AGENTS.md
- [x] **L20** Phase names non-editable — future custom pipeline support would require refactor → tracked in Phase 2

### New Shared Utilities (src/lib/appUtils.ts)
- [x] `isOfferReceived(app)` — canonical offer detection
- [x] `deriveCurrentStatus(phases)` — single source of truth for currentStatus
- [x] `parseSalaryMidpoint(range)` — handles k-suffix and comma formats
- [x] `extractTechTags(jdText)` — extracts known tech keywords from JD requirements

---

## Phase 1: Dashboard UI/UX Fixes

### Status: 🔄 In Progress

### Previously Fixed
- [x] **2.1** Invalid Tailwind class `bg-rose-55` → `bg-rose-50` (ApplicationTable.tsx)
- [x] **7.3** Runtime crash on `app.phases[6].status` (StatsGrid.tsx, PerformanceTelemetry.tsx)
- [x] **3.1** Missing aria-labels on icon-only buttons (App.tsx)
- [x] **2.2** Light mode broken `text-slate-100/90` → `text-slate-100` (App.tsx)
- [x] **1.1** Sidebar nav buttons broken on mobile (App.tsx)
- [x] **1.2** NewApplicationModal 2-col grid overflows on small screens → `grid-cols-1 sm:grid-cols-2`

### Dashboard Reimagination (HIGH PRIORITY)
- [x] **D1** Remove "Technical Skill Matrix" sidebar tab entirely — new shell sidebar has no skill-matrix nav (D2 shell)
- [x] **D2** Add "Resume Builder" sidebar tab (new section — BYOK) — added as nav stub ("Soon") alongside Knowledge Bank
- [ ] **D3** Scaffold Resume Builder page: BYOK key setup + Generate Resume form + history list
- [ ] **D4** PerformanceTelemetry rewritten as generic Pipeline Analytics (3 cards: health score, stage distribution, conversion metrics)

### Remaining UI/UX Issues
- [ ] **1.3** DetailSlideOver fixed height overflows on short viewports (DetailSlideOver.tsx:185)
- [ ] **2.3** LoginScreen entirely dark-themed regardless of theme setting
- [ ] **2.4** Inconsistent modal backdrop opacity (60%/70%/80%)
- [ ] **2.5** DetailSlideOver dialog hardcoded `bg-slate-950` — bypasses CSS vars
- [ ] **2.7** Save icon permanently pulsing (false loading state) (DetailSlideOver.tsx:237)
- [ ] **3.4** Delete confirmation modal not keyboard-dismissible (no Escape handler)
- [ ] **3.8** User sidebar block uses div with onClick, not button (App.tsx:465-524)
- [ ] **1.4** Sidebar has no vertical scroll for overflow (App.tsx:380)
- [ ] **1.5** ApplicationTable actions invisible on touch devices
- [x] **3.2** Search input and selects missing associated labels — added sr-only label to search; selects already have aria-label (D2 shell)
- [ ] **3.3** Toast notifications not announced to screen readers
- [ ] **3.5** No aria-expanded on telemetry toggle
- [ ] **3.6** Table headers missing scope attributes
- [x] **3.7** No prefers-reduced-motion support — global `@media (prefers-reduced-motion)` reset added (D1)
- [ ] **4.1** Table card extreme border radius clips headers
- [ ] **4.2** Timeline connector line misaligned with phase circles (DetailSlideOver.tsx:288,298)
- [ ] **4.3** `overflow-x-hidden` on main content clips potential content
- [ ] **4.4** StatsGrid card heights may vary
- [ ] **7.4** No Escape key handler on custom modals (3 modals)
- [ ] **7.5** No undo mechanism for deletions
- [ ] **7.6** No dark/light mode transition animation
- [ ] **5.2** Empty state briefcase perpetually bouncing (ApplicationTable.tsx)
- [ ] **5.3** Telemetry ping animation infinite and distracting
- [ ] **6.1** App.tsx 822-line god component — extract hooks (useApplications, useAuth, useTheme)
- [ ] **6.2** 11 separate useState calls in NewApplicationModal — useReducer or react-hook-form
- [ ] **6.5** No optimistic rollback on cloud sync failure
- [ ] **7.1** No skeleton loading states for data-dependent components
- [ ] **8.1** NewApplicationModal does not use glass-panel
- [ ] **8.2** Toast notifications bypass glass-panel system
- [ ] **8.4** Many components hardcode slate colors instead of glass variables
- [x] **8.5** Light mode glass effect nearly invisible — fixed at token level (visible hairline border + elevation), verified light+dark (D1)

---

## Phase 2: AI Resume Builder

### Status: 🔴 Not Started

### 2.1 BYOK Key Management
- [ ] BYOK settings UI (provider selector + API key input fields)
- [ ] Store keys in localStorage under `hiretrack_api_keys`
- [ ] Key validation (test call before saving)
- [ ] Per-provider status indicator (configured / not configured)

### 2.2 Vercel Serverless Functions (api/ folder)
- [ ] `api/resume/analyze-jd.ts` — fetch JD URL, extract requirements
- [ ] `api/resume/generate.ts` — generate tailored resume content
- [ ] `api/resume/export-docx.ts` — convert md → docx using templates
- [ ] Key passed via `X-API-Key` header, never stored on server

### 2.3 Knowledge Base
- [ ] DB schema: `master_resumes`, `role_specific_resumes`, `resume_templates`, `jd_analysis_cache`
- [ ] Run `/knowledge-base` command to index templates from ~/Downloads/resumes
- [ ] Store indexed data in Supabase

### 2.4 Resume Generation Pipeline
- [ ] JD parser: extract skills, keywords, experience level, culture signals
- [ ] Template matcher: score templates by JD overlap
- [ ] Content generator: tailor bullet points, reorder experience, inject keywords
- [ ] ATS optimizer: standard headings, no tables/graphics, keyword density check
- [ ] Output: .md (immediate), .docx (via docx library), .pdf (via puppeteer or similar)

### 2.5 Resume Builder UI (React)
- [ ] Generate Resume form: JD URL + company URL + provider selector + generate button
- [ ] Loading state: streaming progress or spinner with stage labels
- [ ] Result view: resume preview + download buttons (.md, .docx, .pdf)
- [ ] History: list of past generated resumes with links to job applications
- [ ] Link generated resume to a job application in the tracker

### 2.6 Email Generation
- [ ] HR/contact finder from JD/company site
- [ ] Tailored outreach email generator
- [ ] Follow-up email templates

---

## Phase 3: LLM Integration

### Status: 🔴 Not Started

### 3.1 Multi-Provider Support
- [ ] LangGraph/LangChain setup in Vercel Functions
- [ ] OpenAI adapter
- [ ] Anthropic (Claude) adapter
- [ ] Google Gemini adapter
- [ ] Provider routing based on user's configured key

### 3.2 Prompt System
- [ ] Prompt file store: `generated/prompts/`
- [ ] Use `/prompt-manager` command for versioning and testing
- [ ] Active prompt config: `generated/prompts/active.json`
- [ ] A/B testing via prompt version compare

---

## Phase 4: User Profile & Personalization

### Status: 🔴 Not Started

- [ ] Extend Supabase user profile (resume style preferences, default provider)
- [ ] Resume history tracking (which resume → which application → outcome)
- [ ] Learn from feedback: if resume X → interview, weight its patterns higher
- [ ] User-specific prompt adaptation

---

## Phase 5: Integration — Tracker ↔ Resume Builder

### Status: 🔴 Not Started

- [ ] Link generated resumes to job applications (resumeLink field)
- [ ] Auto-populate tracker from resume generation (company, role, JD requirements)
- [ ] Correlate resume quality scores with interview success rates
- [ ] Resume version tracking per application

---

## Claude Commands (`.claude/commands/`)

| Command | File | Status |
|---|---|---|
| `/test-runner` | test-runner.md | ✅ Created |
| `/resume-generator` | resume-generator.md | ✅ Created |
| `/knowledge-base` | knowledge-base.md | ✅ Created |
| `/prompt-manager` | prompt-manager.md | ✅ Created |
| `/document-generator` | document-generator.md | ✅ Created |

---

## Progress Log

| Date | Task | Status |
|------|------|--------|
| 2026-06-25 | Initial project analysis | ✅ |
| 2026-06-25 | UI/UX audit (46 issues) | ✅ |
| 2026-06-25 | Fixed 6 critical/high issues | ✅ |
| 2026-06-25 | Full logic audit (20 issues) | ✅ |
| 2026-06-25 | Fixed all 20 logic errors | ✅ |
| 2026-06-25 | Created AGENTS.md (project bible) | ✅ |
| 2026-06-25 | Created 5 Claude commands | ✅ |
| 2026-06-25 | Rewrote PerformanceTelemetry as generic Pipeline Analytics | ✅ |
| 2026-06-25 | Reimagined dashboard vision: two use cases | 🔄 In Progress |
| 2026-06-26 | Designed full automated application pipeline → docs/PIPELINE.md | ✅ |
| 2026-06-26 | Added local-first resume source (FS Access API) to pipeline | ✅ |
| 2026-06-26 | Designed personal-profile knowledge bank (interview gaps/strengths) | ✅ |
| 2026-06-26 | Designed native-experience revamp (desktop-first) → docs/DESIGN.md | ✅ |
| 2026-06-26 | Consolidated build tracks added to task.md | ✅ |
| 2026-06-26 | Branch `redesign`: D1 design tokens (motion/elevation/glass) + light/dark glass fix + reduced-motion; verified light+dark via Playwright | ✅ |
| 2026-06-26 | D2 desktop shell: AppShell + Sidebar + ⌘K command palette (cmdk); slim top bar, sticky footer, constrained filter panel; extracted SettingsModal, removed Header.tsx, added usePlatform; verified both themes via Playwright | ✅ |
| 2026-06-26 | D2 detail pane: adaptive DetailSlideOver (inline pane on ≥1280, overlay sheet below) via container queries; list compacts to cards when pane open; slimmed filter card height; verified via Playwright | ✅ |
| 2026-06-26 | Detail pane full revamp: purpose-driven single-scroll journal — status header + next-action, velocity-aware pipeline spine (time-in-stage, stall→follow-up nudge), collapsible Details/Contacts/Retro; plain language (dropped cockpit/telemetry jargon); dropped dead GDriveResumeUploader usage; verified light+dark | ✅ |
| 2026-06-26 | New Application form revamp: JD-first primary field (autofill keywords) + required company/role + Saved/Applied/Interviewing status segmented + applied date + via, collapsible "More details" (work model, location, comp, benefits, recruiter, resume/portfolio, requirements, priority); buildPhases per intake status; added jdText + priority to types; dropped dead AI-resume block + GDriveResumeUploader; verified collapsed+expanded via Playwright | ✅ |
| 2026-06-26 | Commit `d113ef8`: bundled redesign shell + forms + pipeline docs; caught + gitignored a DB password in .claude/settings.local.json | ✅ |
| 2026-06-26 | Refactor (commit `4816bb2`): extracted shared primitives — lib/apiKeys + useApiKeys, lib/statusStyles (statusColor/statusTone/companyColor + option lists), common/Field (Field/Segmented/OptionSelect/fieldInput), common/CompanyAvatar, common/Modal (Modal+ModalHeader), useEscapeKey; deduped 7 components (−220 net lines), dropped dead imports; verified all surfaces via Playwright | ✅ |
| 2026-06-26 | DB fix (commit `3c3a6dd`): added jdText/jdUrl/priority columns to job_applications — cloud inserts were failing PGRST204. Direct host is IPv6-only/unreachable; resolved region (ap-northeast-1) from AWS ip-ranges, connected via aws-1 IPv4 pooler, ran migration, reloaded PostgREST cache; REST insert now 201 | ✅ |
| 2026-06-26 | D5 mobile shell: BottomNav (tab bar Apps/Resume/Knowledge sharing NAV with Sidebar) + New-application FAB; safe-area insets (top strip + bottom bar); scroll padding for fixed bar; desktop footer hidden on mobile; verified at 390×844 | ✅ |
| 2026-06-26 | D5 mobile polish: vaul bottom-sheets (Modal = sheet on mobile / centered on desktop — upgrades New/Settings/Profile); swipe gestures on cards (right=advance via advanceApplicationStage util, left=archive); usePullToRefresh wired to refreshFromCloud. Verified bottom-sheet + swipe-to-advance (Stage 0→1) + desktop no-regression; PTR touch-only | ✅ |
