-- ═══════════════════════════════════════════════════════════════════════════
-- Document Acknowledgements
-- Client-signed confirmation that the client provided the listed documents.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentAcknowledgementStatus') THEN
    CREATE TYPE "DocumentAcknowledgementStatus" AS ENUM ('PENDING', 'SIGNED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."DocumentAcknowledgement" (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId"  text NOT NULL,
  "clientId"        text NOT NULL,
  "caseId"          text,
  title             text NOT NULL DEFAULT 'Document Acknowledgement',
  status            "DocumentAcknowledgementStatus" NOT NULL DEFAULT 'PENDING',
  items             jsonb NOT NULL DEFAULT '[]'::jsonb,
  "itemCount"       integer NOT NULL DEFAULT 0,
  "statementVersion" text NOT NULL DEFAULT '1.0',
  "sentAt"          timestamptz,
  "viewedAt"        timestamptz,
  "signedAt"        timestamptz,
  "signedByIp"      text,
  "signedUserAgent" text,
  "printedName"     text,
  "signatureDataUrl" text,
  "pdfStoragePath"  text,
  "clientNote"      text,
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "DocumentAcknowledgement_organizationId_idx"
  ON public."DocumentAcknowledgement" ("organizationId");
CREATE INDEX IF NOT EXISTS "DocumentAcknowledgement_clientId_idx"
  ON public."DocumentAcknowledgement" ("clientId");
CREATE INDEX IF NOT EXISTS "DocumentAcknowledgement_status_idx"
  ON public."DocumentAcknowledgement" (status);

-- Foreign keys are required for PostgREST to resolve the
-- client / case / organization embeddings used by the portal queries.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentAcknowledgement_organizationId_fkey') THEN
    ALTER TABLE public."DocumentAcknowledgement"
      ADD CONSTRAINT "DocumentAcknowledgement_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentAcknowledgement_clientId_fkey') THEN
    ALTER TABLE public."DocumentAcknowledgement"
      ADD CONSTRAINT "DocumentAcknowledgement_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentAcknowledgement_caseId_fkey') THEN
    ALTER TABLE public."DocumentAcknowledgement"
      ADD CONSTRAINT "DocumentAcknowledgement_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES public."Case"(id) ON DELETE SET NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Service-role only. Forced RLS with no policies denies every other role,
-- matching the deny-all posture applied to the rest of the schema.
ALTER TABLE public."DocumentAcknowledgement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DocumentAcknowledgement" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public."DocumentAcknowledgement" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."DocumentAcknowledgement" TO service_role;

-- The checklist snapshot is evidence; it must not be rewritten after signing.
CREATE OR REPLACE FUNCTION public.protect_signed_acknowledgement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'SIGNED' THEN
    IF NEW.items IS DISTINCT FROM OLD.items
       OR NEW."itemCount" IS DISTINCT FROM OLD."itemCount"
       OR NEW."statementVersion" IS DISTINCT FROM OLD."statementVersion"
       OR NEW."signatureDataUrl" IS DISTINCT FROM OLD."signatureDataUrl"
       OR NEW."signedAt" IS DISTINCT FROM OLD."signedAt" THEN
      RAISE EXCEPTION 'A signed document acknowledgement cannot be modified';
    END IF;
  END IF;
  NEW."updatedAt" := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_signed_acknowledgement ON public."DocumentAcknowledgement";
CREATE TRIGGER protect_signed_acknowledgement
  BEFORE UPDATE ON public."DocumentAcknowledgement"
  FOR EACH ROW EXECUTE FUNCTION public.protect_signed_acknowledgement();

COMMIT;
