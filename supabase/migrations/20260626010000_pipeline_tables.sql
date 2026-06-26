-- HireTrack pipeline data layer (Track 2)
-- master CV · tailored resumes · contacts · outreach · screening answers ·
-- knowledge bank (competencies + entries) · activity log.
-- Conventions: uuid PKs, timestamptz, jsonb blobs, RLS scoped via
-- (select auth.uid()) = "userId" (subquery wrap = evaluated once per query),
-- indexes on every FK + filter/sort column. Fully idempotent.

-- ── 1. Extend job_applications with pipeline columns ─────────────────────────
-- (jdText already added earlier serves as the raw JD / jd_raw.)
alter table public.job_applications add column if not exists "jd_parsed"        jsonb;
alter table public.job_applications add column if not exists "company_research" jsonb;
alter table public.job_applications add column if not exists "match_score"      int;
alter table public.job_applications add column if not exists "match_breakdown"  jsonb;
alter table public.job_applications add column if not exists "pipeline_stage"   text;

-- ── 2. Master CV (versioned source of truth) ─────────────────────────────────
create table if not exists public.master_resume (
  id          uuid primary key default gen_random_uuid(),
  "userId"    uuid not null references auth.users(id) on delete cascade,
  version     int  not null default 1,
  content_md  text not null,
  structured  jsonb not null default '{}'::jsonb,
  is_current  boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists master_resume_user_idx         on public.master_resume ("userId");
create index if not exists master_resume_user_current_idx on public.master_resume ("userId", is_current);

-- ── 3. Tailored resumes (per job, links version → job) ───────────────────────
create table if not exists public.tailored_resumes (
  id            uuid primary key default gen_random_uuid(),
  "userId"      uuid not null references auth.users(id) on delete cascade,
  job_id        text not null references public.job_applications(id) on delete cascade,
  version       int  not null default 1,
  content_md    text not null,
  ats_docx_path text,
  pdf_path      text,
  keyword_match jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists tailored_resumes_job_idx  on public.tailored_resumes (job_id);
create index if not exists tailored_resumes_user_idx on public.tailored_resumes ("userId");

-- ── 4. Contacts ──────────────────────────────────────────────────────────────
create table if not exists public.contacts (
  id             uuid primary key default gen_random_uuid(),
  "userId"       uuid not null references auth.users(id) on delete cascade,
  job_id         text references public.job_applications(id) on delete cascade,
  name           text not null,
  role           text,
  linkedin       text,
  email          text,
  email_verified boolean not null default false,
  source         text,
  created_at     timestamptz not null default now()
);
create index if not exists contacts_job_idx  on public.contacts (job_id);
create index if not exists contacts_user_idx on public.contacts ("userId");

-- ── 5. Outreach (emails, LI notes/messages, follow-ups) ──────────────────────
create table if not exists public.outreach (
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
create index if not exists outreach_job_idx         on public.outreach (job_id);
create index if not exists outreach_user_status_idx on public.outreach ("userId", status);

-- ── 6. Screening answers (reusable) ──────────────────────────────────────────
create table if not exists public.screening_answers (
  id          uuid primary key default gen_random_uuid(),
  "userId"    uuid not null references auth.users(id) on delete cascade,
  job_id      text references public.job_applications(id) on delete cascade,
  question    text not null,
  answer      text not null,
  reusable    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists screening_answers_user_reusable_idx on public.screening_answers ("userId", reusable);

-- ── 7. Knowledge bank: competency taxonomy (seeded + user-extensible) ────────
create table if not exists public.profile_competencies (
  id        uuid primary key default gen_random_uuid(),
  "userId"  uuid references auth.users(id) on delete cascade,  -- null = system seed
  category  text not null,
  sort      int not null default 0
);
create index if not exists profile_competencies_user_idx on public.profile_competencies ("userId");

-- ── 8. Knowledge bank: entries (gaps / strengths / improvements) ─────────────
create table if not exists public.profile_entries (
  id            uuid primary key default gen_random_uuid(),
  "userId"      uuid not null references auth.users(id) on delete cascade,
  category      text not null,
  kind          text not null check (kind in ('gap','strength','improvement')),
  topic         text not null,
  detail        text,
  severity      int check (severity between 1 and 5),
  status        text not null default 'open' check (status in ('open','in_progress','resolved')),
  action        text,
  source_job_id text references public.job_applications(id) on delete set null,
  source_round  text,
  interviewer   text,
  recurrence    int not null default 1,
  first_seen    timestamptz not null default now(),
  last_reviewed timestamptz,
  resolved_at   timestamptz
);
create index if not exists profile_entries_user_status_idx on public.profile_entries ("userId", status);
create index if not exists profile_entries_user_cat_idx    on public.profile_entries ("userId", category);
create index if not exists profile_entries_source_job_idx  on public.profile_entries (source_job_id);

-- ── 9. Activity log (audit of automated steps + approvals) ───────────────────
create table if not exists public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  "userId"   uuid not null references auth.users(id) on delete cascade,
  job_id     text references public.job_applications(id) on delete cascade,
  stage      text not null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_job_idx on public.activity_log (job_id);

-- ── 10. Seed system competency categories (once) ─────────────────────────────
insert into public.profile_competencies ("userId", category, sort)
select null, c.category, c.sort
from (values
  ('Character', 10),
  ('Communication / Speaking', 20),
  ('CS Fundamentals', 30),
  ('Hands-on Coding', 40),
  ('System Design', 50),
  ('Tool Depth', 60),
  ('Domain Knowledge', 70),
  ('Behavioral / STAR', 80),
  ('Negotiation', 90),
  ('Presence / Confidence', 100),
  ('Time Management', 110)
) as c(category, sort)
where not exists (select 1 from public.profile_competencies where "userId" is null);

-- ── 11. RLS — own-rows policies on every user-scoped table ────────────────────
do $$
declare t text;
declare tbls text[] := array[
  'master_resume','tailored_resumes','contacts','outreach',
  'screening_answers','profile_entries','activity_log'
];
begin
  foreach t in array tbls loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_select on public.%I', t);
    execute format('drop policy if exists own_insert on public.%I', t);
    execute format('drop policy if exists own_update on public.%I', t);
    execute format('drop policy if exists own_delete on public.%I', t);
    execute format('create policy own_select on public.%I for select using ((select auth.uid()) = "userId")', t);
    execute format('create policy own_insert on public.%I for insert with check ((select auth.uid()) = "userId")', t);
    execute format('create policy own_update on public.%I for update using ((select auth.uid()) = "userId") with check ((select auth.uid()) = "userId")', t);
    execute format('create policy own_delete on public.%I for delete using ((select auth.uid()) = "userId")', t);
  end loop;
end $$;

-- profile_competencies: same, but reads also expose system seeds (userId is null)
alter table public.profile_competencies enable row level security;
drop policy if exists own_select on public.profile_competencies;
drop policy if exists own_insert on public.profile_competencies;
drop policy if exists own_update on public.profile_competencies;
drop policy if exists own_delete on public.profile_competencies;
create policy own_select on public.profile_competencies for select using ("userId" is null or (select auth.uid()) = "userId");
create policy own_insert on public.profile_competencies for insert with check ((select auth.uid()) = "userId");
create policy own_update on public.profile_competencies for update using ((select auth.uid()) = "userId") with check ((select auth.uid()) = "userId");
create policy own_delete on public.profile_competencies for delete using ((select auth.uid()) = "userId");
