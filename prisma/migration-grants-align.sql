-- Grants alignment: some tables (created outside Supabase dashboard defaults)
-- lacked DML grants for service_role/anon/authenticated, breaking APIs that
-- only surfaced later (AvailabilityRule slots, notifications, tasks...).
-- Idempotent: safe to re-run.
DO $$ DECLARE r record; BEGIN
  FOR r IN select tablename from pg_tables where schemaname='public' LOOP
    execute format('grant select, insert, update, delete on public.%I to service_role', r.tablename);
    execute format('grant select, insert, update, delete on public.%I to anon', r.tablename);
    execute format('grant select, insert, update, delete on public.%I to authenticated', r.tablename);
  END LOOP;
END $$;
