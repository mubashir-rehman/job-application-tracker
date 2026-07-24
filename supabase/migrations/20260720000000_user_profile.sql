-- user_profile — per-user screening "hard rules" (Track 4): seniority, comp
-- floor, accepted work models/locations, target tracks, never-claim stacks,
-- dealbreakers. Feeds the triage pre-screen (lib/server/triage.ts /
-- src/lib/triage.ts) before any research/tailor token spend. Follows the same
-- shape as resume_instructions: one "current" row per user, RLS-scoped, guests
-- stay localStorage-only.

create table if not exists public.user_profile (
  "id"         uuid primary key default gen_random_uuid(),
  "userId"     uuid not null references auth.users(id) on delete cascade,
  "content"    jsonb not null default '{}'::jsonb,
  "version"    integer not null default 1,
  "is_current" boolean not null default true,
  "created_at" timestamptz not null default now()
);

create index if not exists user_profile_user_current_idx
  on public.user_profile ("userId", "is_current");

alter table public.user_profile enable row level security;

-- SELECT: only the owner's rows.
drop policy if exists "Users can view own profile" on public.user_profile;
create policy "Users can view own profile"
  on public.user_profile for select
  to authenticated
  using ((select auth.uid()) = "userId");

-- INSERT: only as yourself.
drop policy if exists "Users can insert own profile" on public.user_profile;
create policy "Users can insert own profile"
  on public.user_profile for insert
  to authenticated
  with check ((select auth.uid()) = "userId");

-- UPDATE: owner only, and cannot reassign ownership.
drop policy if exists "Users can update own profile" on public.user_profile;
create policy "Users can update own profile"
  on public.user_profile for update
  to authenticated
  using ((select auth.uid()) = "userId")
  with check ((select auth.uid()) = "userId");

-- DELETE: owner only.
drop policy if exists "Users can delete own profile" on public.user_profile;
create policy "Users can delete own profile"
  on public.user_profile for delete
  to authenticated
  using ((select auth.uid()) = "userId");

-- prompt_overrides — Track 4 Prompt Manager: one row per (user, prompt_key) for
-- every user-overridable prompt EXCEPT tailoring instructions (which already has
-- its own resume_instructions table/hook — left as-is to avoid migrating existing
-- data). Shipped defaults live in code (src/lib/promptDefaults.ts); a missing row
-- here just means "using the default".

create table if not exists public.prompt_overrides (
  "id"         uuid primary key default gen_random_uuid(),
  "userId"     uuid not null references auth.users(id) on delete cascade,
  "prompt_key" text not null,
  "content"    text not null default '',
  "updated_at" timestamptz not null default now()
);

create unique index if not exists prompt_overrides_user_key_idx
  on public.prompt_overrides ("userId", "prompt_key");

alter table public.prompt_overrides enable row level security;

drop policy if exists "Users can view own prompt overrides" on public.prompt_overrides;
create policy "Users can view own prompt overrides"
  on public.prompt_overrides for select
  to authenticated
  using ((select auth.uid()) = "userId");

drop policy if exists "Users can insert own prompt overrides" on public.prompt_overrides;
create policy "Users can insert own prompt overrides"
  on public.prompt_overrides for insert
  to authenticated
  with check ((select auth.uid()) = "userId");

drop policy if exists "Users can update own prompt overrides" on public.prompt_overrides;
create policy "Users can update own prompt overrides"
  on public.prompt_overrides for update
  to authenticated
  using ((select auth.uid()) = "userId")
  with check ((select auth.uid()) = "userId");

drop policy if exists "Users can delete own prompt overrides" on public.prompt_overrides;
create policy "Users can delete own prompt overrides"
  on public.prompt_overrides for delete
  to authenticated
  using ((select auth.uid()) = "userId");
