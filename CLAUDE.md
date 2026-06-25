# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **AGENTS.md is the full project bible.** Read it at the start of every session — it contains architecture, design rules, data contracts, and behavioral rules. CLAUDE.md covers commands and a quick architecture orientation only.

---

## Commands

```bash
npm run dev        # Dev server on http://localhost:3000
npm run lint       # TypeScript type-check (tsc --noEmit) — run after every code change
npm run build      # Production bundle
npm run db:migrate # Run Supabase schema migration via scripts/migrate.js
```

No test runner is configured. Use `npm run lint` to catch errors. Manual browser testing is the verification path.

---

## Architecture

**HireTrack** is a single-page React 19 app (Vite + TypeScript + Tailwind v4) deployed on Vercel. It tracks job applications through a fixed 7-phase interview pipeline and is evolving into an AI-powered resume builder (BYOK model).

### Entry point & routing

`src/main.tsx` mounts `BrowserRouter` with two routes: `/` → `App.tsx`, `/privacy` → `PrivacyPolicy.tsx`. `vercel.json` rewrites all paths to `/` for SPA behavior.

### State & data flow

Three custom hooks own all state — `App.tsx` is UI-only:

| Hook | Owns |
|---|---|
| `useAuth` (`src/hooks/useAuth.ts`) | Supabase session, guest mode, OAuth popup handshake |
| `useApplications` (`src/hooks/useApplications.ts`) | Application CRUD with optimistic UI + localStorage mirror |
| `useTheme` (`src/hooks/useTheme.ts`) | `light`/`dark` theme, persisted to localStorage |

**Optimistic UI pattern**: every mutation writes to local state + localStorage first, then fires the Supabase call in the background. Failures show a "saved locally" warning toast — there is no rollback yet.

### Persistence layers

- **Supabase** (`src/supabaseClient.ts` + `src/lib/supabaseService.ts`): single table `job_applications` with RLS. `isSupabaseConfigured` guards all cloud calls — the app works fully offline without env vars.
- **localStorage**: always mirrors Supabase state. Keys are user-scoped (`hiretrack_applications_user_{userId}`) or guest-scoped (`hiretrack_applications_guest`).

### Path alias

`@` resolves to the **project root** (not `src/`). shadcn components are at `@/components/ui/`.

### Shared utilities (never reimplement inline)

`src/lib/appUtils.ts` exports four canonical functions:
- `isOfferReceived(app)` — offer detection used by StatsGrid + PerformanceTelemetry
- `deriveCurrentStatus(phases)` — single source of truth for `currentStatus`
- `parseSalaryMidpoint(range)` — handles `$190k`, `$190,000`, and plain number formats
- `extractTechTags(jdText)` — extracts tech keywords from JD requirements

### Design system

- All new components must use `glass-panel` / `glass-panel-hover` utilities from `src/index.css`. Never hardcode `bg-slate-950` or `bg-slate-900`.
- Color roles: indigo = primary, emerald = success/offer, amber = warning/negotiation, rose = danger/reject.
- Tailwind v4 (no `tailwind.config.js` — configured via `@tailwindcss/vite` plugin).

### Key constraints

- `phases` array is always exactly 7 items — never mutate its length.
- `currentStatus` is always derived via `deriveCurrentStatus(phases)` — never set to an arbitrary string.
- BYOK API keys live in `localStorage` (`hiretrack_api_keys`) and travel only in `X-API-Key` request headers. They must never be stored in Supabase or logged.
- No company-specific logic anywhere in business logic (no `if company === '...'` guards).

### Dead code / disabled features

- `src/components/GDriveResumeUploader.tsx` and `src/lib/googleDriveService.ts` — Google Drive OAuth pending app review. Do not use; do not delete.

---

## Environment Variables

```env
VITE_SUPABASE_URL=         # Required for cloud sync
VITE_SUPABASE_ANON_KEY=    # Required for cloud sync
SUPABASE_DB_PASSWORD=      # Required only for npm run db:migrate
```

All `VITE_` vars are baked into the client bundle at build time. The app runs in offline-only mode if they are absent.
