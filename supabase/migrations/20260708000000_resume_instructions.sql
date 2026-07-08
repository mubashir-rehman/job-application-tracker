-- resume_instructions — per-user custom tailoring instructions (system prompt).
-- Sits alongside master_resume: one "current" row per user, RLS-scoped so each
-- user only ever sees/edits their own. Guests stay localStorage-only (no rows).

create table if not exists public.resume_instructions (
  "id"         uuid primary key default gen_random_uuid(),
  "userId"     uuid not null references auth.users(id) on delete cascade,
  "content_md" text not null default '',
  "version"    integer not null default 1,
  "is_current" boolean not null default true,
  "created_at" timestamptz not null default now()
);

create index if not exists resume_instructions_user_current_idx
  on public.resume_instructions ("userId", "is_current");

alter table public.resume_instructions enable row level security;

-- SELECT: only the owner's rows.
drop policy if exists "Users can view own instructions" on public.resume_instructions;
create policy "Users can view own instructions"
  on public.resume_instructions for select
  to authenticated
  using ((select auth.uid()) = "userId");

-- INSERT: only as yourself.
drop policy if exists "Users can insert own instructions" on public.resume_instructions;
create policy "Users can insert own instructions"
  on public.resume_instructions for insert
  to authenticated
  with check ((select auth.uid()) = "userId");

-- UPDATE: owner only, and cannot reassign ownership.
drop policy if exists "Users can update own instructions" on public.resume_instructions;
create policy "Users can update own instructions"
  on public.resume_instructions for update
  to authenticated
  using ((select auth.uid()) = "userId")
  with check ((select auth.uid()) = "userId");

-- DELETE: owner only.
drop policy if exists "Users can delete own instructions" on public.resume_instructions;
create policy "Users can delete own instructions"
  on public.resume_instructions for delete
  to authenticated
  using ((select auth.uid()) = "userId");
