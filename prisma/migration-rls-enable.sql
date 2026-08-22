-- Security hardening: enable Row Level Security on ALL public tables.
-- Application access flows exclusively through the service-role key
-- (which bypasses RLS) inside authenticated server code, so deny-by-default
-- has zero functional impact while closing direct anon/authenticated access.
-- Existing policies on intake_submissions / portal_submissions remain intact.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    select tablename from pg_tables
    where schemaname = 'public' and tablename not like '\_%'
  LOOP
    execute format('alter table if exists public.%I enable row level security;', t.tablename);
  END LOOP;
END $$;

-- Force RLS even for table owners (belt-and-suspenders)
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    select tablename from pg_tables
    where schemaname = 'public' and tablename not like '\_%'
  LOOP
    execute format('alter table if exists public.%I force row level security;', t.tablename);
  END LOOP;
END $$;
