# HireTrack — Agent Instructions

This file is read by Claude Code at the start of every session. It is the single source of truth for project context, conventions, and behavioral rules.

---

## Project Identity

**HireTrack** — A personal job application tracker evolving into an AI-powered resume builder.

- **Live URL**: Deployed on Vercel
- **Local dev**: `npm run dev` → http://localhost:3000
- **Current phase**: Phase 1 (UI/UX fixes) → Phase 2 (AI Resume Builder)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4 |
| Animation | Framer Motion (`motion/react`) |
| UI components | shadcn/ui (`@/components/ui/`) |
| Icons | lucide-react |
| Backend/DB | Supabase (PostgreSQL + RLS + Auth) |
| Deployment | Vercel (SPA rewrite via vercel.json) |
| AI Backend | Vercel Serverless Functions (planned, `/api/` folder) |
| LLM Orchestration | LangGraph + LangChain (planned) |

---

## Repository Structure

```
src/
├── App.tsx                    # Root component (822 lines — god component, refactor planned)
├── types.ts                   # JobApplication, InterviewPhase, PostMortem types
├── data.ts                    # createDefaultPhases(), INITIAL_APPLICATIONS (generic demo data)
├── supabaseClient.ts          # Supabase init + isSupabaseConfigured guard
├── index.css                  # Design system: CSS vars, glass-panel utilities, fonts
├── main.tsx                   # React entry + Router
├── lib/
│   ├── supabaseService.ts     # CRUD: fetch/add/update/delete/bulkSync
│   ├── appUtils.ts            # Shared utilities: isOfferReceived, deriveCurrentStatus, parseSalaryMidpoint, extractTechTags
│   └── googleDriveService.ts  # DISABLED — Google Drive OAuth pending app review
├── components/
│   ├── ApplicationTable.tsx   # Filterable/sortable pipeline table
│   ├── DetailSlideOver.tsx    # 7-phase timeline editor (slide-over modal)
│   ├── StatsGrid.tsx          # 4-card KPI dashboard
│   ├── PerformanceTelemetry.tsx # Pipeline analytics (generic, no hardcoded companies)
│   ├── NewApplicationModal.tsx # Add new application form
│   ├── LoginScreen.tsx        # Auth: Google OAuth, email/password, guest mode
│   ├── ProfileModal.tsx       # Account settings + deactivation
│   ├── Footer.tsx             # Links: portfolio, GitHub, privacy
│   └── GDriveResumeUploader.tsx # DEAD CODE — do not use, do not delete yet
└── pages/
    └── PrivacyPolicy.tsx
```

---

## App Vision & Two Major Use Cases

### Use Case 1: Job Application Tracker
Track applications through a fixed 7-phase pipeline:
1. Application Submitted → 2. Initial HR Pre-screening → 3. Technical Interview →
4. Personality Interview → 5. Final Technical Interview → 6. HR Negotiation → 7. Offer Letter

### Use Case 2: AI Resume Builder (BYOK)
- User provides their own LLM API key (OpenAI / Anthropic / Gemini) — stored in browser localStorage only
- Mandatory input: job description URL
- Optional input: company website URL
- Output: ATS-optimized resume in .md, .docx, .pdf formats
- Backend: Vercel Serverless Functions receive key in `X-API-Key` header, use it once, never store it
- LangGraph/LangChain for orchestration

### Dashboard Navigation (post-reimagination)
```
Sidebar
├── 📋 Applications   (tracker: StatsGrid + Pipeline Analytics + ApplicationTable)
└── 🤖 Resume Builder (AI: BYOK key setup + Generate + History + Templates)
```

---

## Design System

### Glass Panel System (src/index.css)
- `glass-panel` — backdrop-blur(16px) + semi-transparent bg + subtle border
- `glass-panel-hover` — lift (-2px translateY) + glow on hover
- `ambient-bg` — radial gradient background with indigo/purple accents
- CSS variables: `--bg-950`, `--bg-900`, `--text-100`, `--glass-blend`, `--glass-border` (light + dark variants)
- **Rule**: New components MUST use glass-panel utilities. Never hardcode `bg-slate-950` or `bg-slate-900`.

### Color Palette
- **Primary**: Indigo (`indigo-600` dark, `indigo-400` light)
- **Success**: Emerald (offers, completed phases)
- **Warning**: Amber (HR/negotiation phases)
- **Danger**: Rose (rejections, deletes)
- **Neutral**: Slate (backgrounds, text, borders)

### Typography
- **Headings**: Space Grotesk (`.font-display`)
- **Body**: Inter
- **Monospace/data**: JetBrains Mono (`.font-mono`)

### Tailwind Alias
- `@` resolves to the **project root** (not `src/`), e.g., `@/components/ui/button`

---

## Data Architecture

### Supabase Table: `job_applications`
Single table. JSONB columns for `phases` (array of 7 InterviewPhase) and `postMortem`. RLS policies enforce user ownership.

### Optimistic UI Pattern
1. Immediate state update → show toast
2. Supabase sync in background
3. On failure → "Saved locally in offline sandbox mode" toast
4. localStorage always mirrors state

### localStorage Keys
- `hiretrack_theme` — `'light' | 'dark'`
- `hiretrack_show_telemetry` — `'true' | 'false'`
- `hiretrack_applications_user_{userId}` — authenticated user cache
- `hiretrack_applications_guest` — guest user cache
- `hiretrack_api_keys` — BYOK API keys `{ openai?, anthropic?, gemini? }` (planned)

### Auth Modes
- Google OAuth (popup flow)
- Email/password
- Guest mode (localStorage only, no Supabase)

---

## Shared Utilities (src/lib/appUtils.ts)

These must be used everywhere instead of inline reimplementations:

| Function | Purpose |
|---|---|
| `isOfferReceived(app)` | Canonical offer detection for StatsGrid + PerformanceTelemetry |
| `deriveCurrentStatus(phases)` | Single source of truth for currentStatus (from highest active/completed phase) |
| `parseSalaryMidpoint(range)` | Parse "$190k-$240k" or "$190,000-$240,000" → numeric midpoint |
| `extractTechTags(jdText)` | Extract known tech keywords from keyJdRequirements |

**Rule**: Never reimplement these inline. Import from `appUtils`.

---

## Critical Rules (Non-Negotiable)

1. **No hardcoded company names in logic** — The app is user-agnostic. No `if company === 'nvidia'` anywhere in business logic.
2. **currentStatus is always derived** — Use `deriveCurrentStatus(phases)` from appUtils. Never manually set it to an arbitrary string.
3. **glass-panel for all new UI** — No hardcoded slate backgrounds.
4. **BYOK keys never leave the browser session** — API keys go in localStorage and in request headers only. They are never stored in Supabase or logged.
5. **Phases array is always 7 items** — `createDefaultPhases()` initializes it; never mutate the array length.

---

## Behavioral Rules for Claude

- **Fix bugs autonomously** — No need to ask permission for code fixes. User trusts your judgment.
- **Ask before major architectural changes** — New pages, new tables, new Vercel Functions: propose the design first.
- **Fix, don't flag** — When you find a bug during unrelated work, fix it in the same commit.
- **No summary at end of responses** — User reads the diff. Skip "here's what I did" summaries.
- **Keep files focused** — Don't refactor or add comments to untouched code. Touch only what the task requires.
- **task.md is the source of truth for task status** — Update it when work completes.
- **Prefer Edit over Write** — Always Read a file before editing it. Never overwrite a file without reading it first.
- **Check lint after any code change** — Run `npm run lint` to catch TypeScript errors before finishing.

---

## Environment Variables

```env
# Required for Supabase features
VITE_SUPABASE_URL=""
VITE_SUPABASE_ANON_KEY=""

# AI Providers — user provides via BYOK UI, not .env
# OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY are user-supplied at runtime

# App
APP_URL="http://localhost:3000"
```

---

## Resume Templates

Location: `/home/mubashir/Downloads/resumes` (43 files — .docx, .pdf, .md)

Key file: `Mubashir_Rehman_Master_CV_Source_of_Truth_Export.md` — master CV, base for all generation.

Generated resumes output to: `generated/{company}_{role}_{date}/` (planned)

---

## Development Commands

```bash
npm run dev        # Start dev server on :3000
npm run lint       # TypeScript type check (tsc --noEmit)
npm run build      # Production build
npm run db:migrate # Run Supabase migrations
```

---

## Current Task Status

See `task.md` for the full task list with completion status.

**Quick status:**
- Phase 1 (UI/UX): ~8 of 46 issues fixed, active
- Phase 2 (AI Resume Builder): Not started
- Phase 3 (LLM Integration): Not started
- Phase 4-5: Not started

---

## Known Dead Code / Disabled Features

- `GDriveResumeUploader.tsx` — Google Drive OAuth disabled pending app review (commit `0172c44`)
- `src/lib/googleDriveService.ts` — same reason
- `.claude/skills/` — old documentation files from previous session, superseded by `.claude/commands/`

---

## Future Work

- Candidate ideas (OSS reuse, feature backlog, open discovery questions) migrated from the archived ApplyFlow project: `docs/research/applyflow-research.md`. Not commitments — future-work reference only.
