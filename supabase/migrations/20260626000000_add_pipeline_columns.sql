-- Supabase Database Migration
-- Target: public.job_applications
-- Description: Adds the pipeline columns introduced with the JD-first new-application
-- form revamp — jdUrl (source URL), jdText (raw pasted JD), priority (fit marker).
-- These mirror the optional fields added to the JobApplication type, so cloud
-- inserts/updates stop failing with "Could not find the 'jdText' column".

alter table public.job_applications add column if not exists "jdUrl" text;
alter table public.job_applications add column if not exists "jdText" text;
alter table public.job_applications add column if not exists "priority" text;
