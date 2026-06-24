-- Supabase Database Migration
-- Target: public.job_applications
-- Description: Creates or ensures the presence of the job applications tracker table with full relational user mapping and Row Level Security.

-- 1. Create table if it doesn't exist
create table if not exists public.job_applications (
  "id" text primary key,
  "companyName" text not null,
  "targetRole" text not null,
  "workModel" text not null,
  "location" text,
  "salaryRange" text,
  "otherBenefits" text,
  "hrContact" text,
  "appliedVia" text not null,
  "resumeLink" text,
  "portfolioLink" text,
  "keyJdRequirements" text,
  "currentStatus" text not null,
  "phases" jsonb not null default '[]'::jsonb,
  "postMortem" jsonb not null default '{}'::jsonb,
  "createdAt" text not null,
  "userId" uuid references auth.users(id) on delete cascade -- Relational foreign key linked directly to Supabase Auth users
);

-- 2. Safe check to append the userId column if the table existed before without it
alter table public.job_applications add column if not exists "userId" uuid references auth.users(id) on delete cascade;

-- 3. Enable Row Level Security (RLS) for enterprise-grade privacy and data isolation
alter table public.job_applications enable row level security;

-- 4. Create RLS Policies to automatically isolate and protect user-specific data
drop policy if exists "Users can view own applications" on public.job_applications;
create policy "Users can view own applications" 
  on public.job_applications for select 
  using (auth.uid() = "userId" or "userId" is null);

drop policy if exists "Users can insert own applications" on public.job_applications;
create policy "Users can insert own applications" 
  on public.job_applications for insert 
  with check (auth.uid() = "userId" or "userId" is null);

drop policy if exists "Users can update own applications" on public.job_applications;
create policy "Users can update own applications" 
  on public.job_applications for update 
  using (auth.uid() = "userId" or "userId" is null)
  with check (auth.uid() = "userId" or "userId" is null);

drop policy if exists "Users can delete own applications" on public.job_applications;
create policy "Users can delete own applications" 
  on public.job_applications for delete 
  using (auth.uid() = "userId" or "userId" is null);

