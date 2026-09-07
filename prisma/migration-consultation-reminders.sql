BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
ALTER TABLE public."Consultation"
  ADD COLUMN IF NOT EXISTS reminder_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminded_start_time timestamptz;

-- Concurrent visitors cannot reserve overlapping appointments for one consultant.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultation_no_overlap') THEN
    ALTER TABLE public."Consultation" ADD CONSTRAINT consultation_no_overlap
      EXCLUDE USING gist (consultant_id WITH =, tstzrange(start_time, end_time, '[)') WITH &&)
      WHERE (status IN ('SCHEDULED', 'IN_PROGRESS'));
  END IF;
END $$;

-- A lease makes retries safe and recovers work after a function crash.
CREATE OR REPLACE FUNCTION public.claim_consultation_reminders()
RETURNS SETOF public."Consultation"
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public."Consultation" c SET reminder_claimed_at = now()
  WHERE c.id IN (
    SELECT id FROM public."Consultation"
    WHERE status = 'SCHEDULED'
      AND start_time > now() AND start_time <= now() + interval '30 minutes'
      AND reminded_start_time IS DISTINCT FROM start_time
      AND (reminder_claimed_at IS NULL OR reminder_claimed_at < now() - interval '5 minutes')
    ORDER BY start_time LIMIT 10 FOR UPDATE SKIP LOCKED
  ) RETURNING c.*;
$$;
REVOKE ALL ON FUNCTION public.claim_consultation_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_consultation_reminders() TO service_role;
COMMIT;
