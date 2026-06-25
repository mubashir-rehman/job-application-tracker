# HireTrack — Automated Application Pipeline (Design)

> Status: **Design / proposed.** Not yet implemented. Owns Phases 2–5 of `task.md`.
> Decisions locked: **assisted with approval gates** · **built into HireTrack (Vercel + Supabase, BYOK)** · **paste JD/URL intake** · **local-first resume source**.

## Core principle
One **master CV** is the single source of truth. Every job flows: intake → enrich → score → tailor (as a *diff* off master) → validate → draft outreach → **you approve once** → commit to the tracker and send/export. Every artifact links to the job and is logged, so nothing is lost across sessions (the failure mode from the prior ChatGPT workflow).

```
            ┌──────────── MASTER CV (versioned source of truth) ────────────┐
            │  honest · project-names-stripped · defensible-only · structured │
            └───────────────────────────────┬─────────────────────────────────┘
                                            │ (diff, not regenerate)
 PASTE JD/URL                               ▼
   │                                  ┌──────────┐
   ▼                                  │ 4 TAILOR │─► 5 RENDER ─► .docx (ATS-safe)
┌─────────┐  ┌──────────┐  ┌────────┐ │  resume  │    (split)   .pdf  (designed)
│1 INTAKE │─►│2 RESEARCH│─►│3 SCORE │─►└──────────┘                  │
│parse JD │  │ company  │  │+ fit/  │       │                       ▼
└─────────┘  └──────────┘  │positon │       ├─► 6 ATS CHECK (real linearize + keyword %)
                           └────────┘       ├─► 7 OUTREACH (email+note, verified, char-limited)
                                            └─► 8 SCREENING ANSWERS (salary@market, reusable)
                                                          │
                                              ╔═══════════▼════════════╗
                                              ║  9 APPROVAL GATE (you) ║
                                              ╚═══════════╤════════════╝
                                                          ▼
                                         10 COMMIT → job_applications (7-phase tracker)
                                                          │
                              ┌───────────────────────────┼───────────────────────────┐
                              ▼                            ▼                           ▼
                       11 FOLLOW-UP (cron)        12 INTERVIEW PREP          13 RETRO → KNOWLEDGE BANK
                       no reply in N days          per-interviewer,           categorized gaps/strengths
                       → draft nudge               flags weak spots           feeds master + scoring
```

## Stages (each a Vercel serverless function · LangGraph-orchestrated · BYOK via `X-API-Key`)
Each stage maps to a project skill (`.claude/commands/`) that is the local/dev engine; productionize into Vercel functions.

| # | Stage | Does | Owning skill | Fixes |
|---|---|---|---|---|
| 0 | Master CV bootstrap | Ingest local resume files → structured master; strip internal project names → problem/solution/domain; honesty pass. One-time + maintained. | `/knowledge-base` | re-derivation bugs |
| 1 | Intake | Paste JD text/URL → fetch + parse `jd_parsed` (must/nice-haves, exact keyword phrasing, seniority, stack, culture, comp) | — | — |
| 2 | Company research | Site/products/stack/news → surface what they do that matches your real experience but isn't in the JD | — | JD-parroting |
| 3 | Match & positioning score | master vs JD → score + breakdown; **flags positioning mismatch** (Lead/5y stretch · C++/Qt = weak/non-target → recommend skip) | — | spray-and-pray; overclaiming |
| 4 | Tailor (diff off master) | Reorder/rewrite bullets to mirror JD priorities + exact terminology; **defensibility filter** (only what you can defend 10 min) | `/resume-generator` | cosmetic-bold; undefendable claims; missing-project bugs |
| 5 | Render + ATS split | **Two artifacts**: single-column ATS-safe `.docx` + designed PDF | `/document-generator` | ATS-vs-pretty conflict |
| 6 | ATS check (real) | Extract text, verify top-to-bottom linearization, compute keyword-match %, standard headings, no tables | `/test-runner` | "ATS validation theater" |
| 7 | Outreach drafting | Find + **verify** recruiter/HR email (flag unverified); draft "what I bring" email + LI note with hard char-counter | — | guessed emails; notes over limit |
| 8 | Screening answers | Salary anchored to **role/market rate, not local PKR**; immigration/remote; "what can you bring"; saved reusable | — | underpricing |
| 9 | **Approval gate** | One review screen: both files, ATS score + keyword %, drafts, answers, skip/stretch/apply rec. One click approves | — | — |
| 10 | Commit & track | Create/advance `job_applications`, attach resume version + contact + outreach, set `currentStatus`, enter 7-phase tracker | — | lost-track |
| 11 | Follow-up (cron) | No reply in N days → draft nudge + reminder | — | — |
| 12 | Interview prep | From JD + company + interviewer LinkedIn; **surface known weak spots** from the knowledge bank | — | reactive prep |
| 13 | Retro → knowledge bank | Capture debrief → categorized gaps/strengths; feed back into master positioning + scoring | `/prompt-manager` (prompt eval) | missing learning loop |

## Human-in-control
Automated: research, scoring, tailoring, rendering, validation, drafting. **Gated (you approve)** anything leaving your machine — submit, email send, connection note. LinkedIn actions stay manual (ToS): pipeline drafts, you paste. *Optional later:* send approved emails via the available Gmail integration.

---

## Resume Source Layer (local-first, "accessed via browser")
Pluggable source in front of Stage 0 (read) and Stage 5 (write). Replaces the disabled Google Drive feature.

```
┌──────────── ResumeSource (interface) ────────────┐
│  list() · read(file) · write(path, bytes) · sync() │
└───────┬────────────────┬───────────────────┬───────┘
        ▼                ▼                   ▼
  LOCAL FOLDER      Manual upload       Google Drive
  (FS Access API)   (<input file>)      (DISABLED — kept off)
   ★ default
```

**Local folder source (all client-side):**
1. `showDirectoryPicker()` → user grants HireTrack a handle to e.g. `~/Downloads/resumes`.
2. Persist handle in **IndexedDB**; re-grant via `queryPermission()`/`requestPermission()` (Chrome prompts once/session).
3. Read `.md` (direct), `.docx` (**mammoth.js**), `.pdf` (**pdf.js**) — all in-browser. Lazy-loaded only when a folder is connected.
4. **Write back** generated artifacts straight into `~/Downloads/resumes/generated/{company}_{role}_{date}/` — no download prompts.

**Properties:** raw files never leave the machine (only extracted text → LLM via BYOK); Supabase stores only the *structured* master + tailored metadata; local folder is the file-of-record.
**Support:** Chromium (Chrome/Edge/Brave). **Fallback** for Firefox/Safari: `<input webkitdirectory>` (read-only) + browser-download outputs; detected at runtime.

---

## Personal Profile Knowledge Bank
Categorized, compounding record of interview gaps, strengths, and improvement actions. Supersedes the lighter `learnings` concept. Written by Stage 13; read by Stages 3, 4, 12.

**Inputs → outputs**
- **Retro (13)** auto-extracts categorized rows from each debrief.
- **Interview prep (12)** pulls *open* entries matching the upcoming role's stack/category.
- **Positioning (3–4)** reads gaps → won't foreground known-weak tools.
- **Growth dashboard** — gaps by category, recurrence trend, % resolved over time.

---

## Data model (Supabase — RLS, per `supabase-postgres-best-practices`)
Conventions: `uuid` PKs (`gen_random_uuid()`), `timestamptz`, `jsonb` for structured blobs, **RLS enabled** on every table with policies scoped via `(select auth.uid()) = "userId"` (subquery wrap = evaluated once per query), and **indexes on every FK + every filter/sort column**.

```sql
-- MASTER CV (versioned source of truth)
create table public.master_resume (
  id          uuid primary key default gen_random_uuid(),
  "userId"    uuid not null references auth.users(id) on delete cascade,
  version     int  not null default 1,
  content_md  text not null,
  structured  jsonb not null default '{}'::jsonb,
  is_current  boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on public.master_resume ("userId");
create index on public.master_resume ("userId", is_current);

-- TAILORED RESUMES (per job, links version → job)
create table public.tailored_resumes (
  id            uuid primary key default gen_random_uuid(),
  "userId"      uuid not null references auth.users(id) on delete cascade,
  job_id        text not null references public.job_applications(id) on delete cascade,
  version       int  not null default 1,
  content_md    text not null,
  ats_docx_path text,            -- local path or storage ref
  pdf_path      text,
  keyword_match jsonb not null default '{}'::jsonb,  -- {matched:[], missing:[], pct}
  created_at    timestamptz not null default now()
);
create index on public.tailored_resumes (job_id);
create index on public.tailored_resumes ("userId");

-- CONTACTS
create table public.contacts (
  id            uuid primary key default gen_random_uuid(),
  "userId"      uuid not null references auth.users(id) on delete cascade,
  job_id        text references public.job_applications(id) on delete cascade,
  name          text not null,
  role          text,
  linkedin      text,
  email         text,
  email_verified boolean not null default false,
  source        text,
  created_at    timestamptz not null default now()
);
create index on public.contacts (job_id);
create index on public.contacts ("userId");

-- OUTREACH (emails, LI notes/messages)
create table public.outreach (
  id          uuid primary key default gen_random_uuid(),
  "userId"    uuid not null references auth.users(id) on delete cascade,
  job_id      text not null references public.job_applications(id) on delete cascade,
  contact_id  uuid references public.contacts(id) on delete set null,
  type        text not null check (type in ('email','li_note','li_message','followup')),
  draft       text not null,
  char_count  int  not null default 0,
  status      text not null default 'draft' check (status in ('draft','approved','sent')),
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.outreach (job_id);
create index on public.outreach ("userId", status);

-- SCREENING ANSWERS (reusable)
create table public.screening_answers (
  id          uuid primary key default gen_random_uuid(),
  "userId"    uuid not null references auth.users(id) on delete cascade,
  job_id      text references public.job_applications(id) on delete cascade,
  question    text not null,
  answer      text not null,
  reusable    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.screening_answers ("userId", reusable);

-- KNOWLEDGE BANK: competency taxonomy (seeded + user-extensible)
create table public.profile_competencies (
  id        uuid primary key default gen_random_uuid(),
  "userId"  uuid references auth.users(id) on delete cascade, -- null = system seed
  category  text not null,   -- Character, Communication/Speaking, CS Fundamentals,
                             -- Hands-on Coding, System Design, Tool Depth, Domain Knowledge,
                             -- Behavioral/STAR, Negotiation, Presence/Confidence, Time Mgmt, ...
  sort      int not null default 0
);

-- KNOWLEDGE BANK: entries
create table public.profile_entries (
  id           uuid primary key default gen_random_uuid(),
  "userId"     uuid not null references auth.users(id) on delete cascade,
  category     text not null,
  kind         text not null check (kind in ('gap','strength','improvement')),
  topic        text not null,
  detail       text,
  severity     int check (severity between 1 and 5),
  status       text not null default 'open' check (status in ('open','in_progress','resolved')),
  action       text,
  source_job_id text references public.job_applications(id) on delete set null,
  source_round  text,
  interviewer   text,
  recurrence    int not null default 1,
  first_seen    timestamptz not null default now(),
  last_reviewed timestamptz,
  resolved_at   timestamptz
);
create index on public.profile_entries ("userId", status);
create index on public.profile_entries ("userId", category);
create index on public.profile_entries (source_job_id);

-- ACTIVITY LOG (audit of automated steps + approvals)
create table public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  "userId"   uuid not null references auth.users(id) on delete cascade,
  job_id     text references public.job_applications(id) on delete cascade,
  stage      text not null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.activity_log (job_id);
```

**Extend `job_applications`** (existing table): add `jd_raw text`, `jd_parsed jsonb`, `company_research jsonb`, `match_score int`, `match_breakdown jsonb`, `pipeline_stage text`.

**RLS template (apply to every table above):**
```sql
alter table public.<t> enable row level security;
create policy "own_select" on public.<t> for select using ((select auth.uid()) = "userId");
create policy "own_insert" on public.<t> for insert with check ((select auth.uid()) = "userId");
create policy "own_update" on public.<t> for update using ((select auth.uid()) = "userId") with check ((select auth.uid()) = "userId");
create policy "own_delete" on public.<t> for delete using ((select auth.uid()) = "userId");
```
*(`profile_competencies` also allows reading system seeds: `using ("userId" is null or (select auth.uid()) = "userId")`.)*

---

## Build phases (see task.md tracks)
- **Phase A (MVP):** master CV + knowledge-bank tables · corrected master-CV prompt · intake/parse · tailor (diff) · ATS `.docx` + PDF render · ATS check · approve · commit to tracker · local resume source.
- **Phase B:** company research · positioning score · outreach + email verify · screening answers.
- **Phase C:** follow-up scheduler · interview prep · retro → knowledge-bank loop.
- **Phase D:** browser-capture intake · analytics (resume version → outcome correlation).

## Open decisions
1. PDF on Vercel: Puppeteer + `@sparticuz/chromium` (recommended) vs lighter HTML→PDF service.
2. Email verification: Hunter.io (paid, reliable) vs free MX/syntax check.
3. Email sending: draft-only (recommended MVP) vs Gmail API send-with-approval.
4. Scheduling: Vercel Cron vs Supabase `pg_cron`.
5. **Observability (LangSmith): DEFERRED** (revisit during Phase C). When picked up: opt-in, **off by default**. Enable in *dev only* against the developer's own LangSmith account (`LANGCHAIN_TRACING_V2` env) to debug the LangGraph stages. **Never** send BYOK users' traces (resume/JD/recruiter/salary data) to LangChain cloud in production — it contradicts the local-first/BYOK design. For per-prompt eval use `/prompt-manager` + the local `activity_log` table instead; if a user ever wants tracing, require their own LangSmith key (explicit consent).
