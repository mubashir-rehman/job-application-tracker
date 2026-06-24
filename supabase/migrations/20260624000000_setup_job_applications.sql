-- Supabase Database Migration
-- Target: public.job_applications
-- Description: Creates or ensures the presence of the job applications tracker table, adding user tracking support.

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
  "userId" text -- Associates opportunities with signed-in users
);

-- 2. Safe check to append the userId column if the table existed before without it
alter table public.job_applications add column if not exists "userId" text;

-- 3. Disable Row Level Security (RLS) for simple integration, or configure Row Level Security policies
alter table public.job_applications disable row level security;
