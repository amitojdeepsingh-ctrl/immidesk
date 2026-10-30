-- ═══════════════════════════════════════════════════════════════════════════
-- Document acknowledgements: reference the merged PDF they are attached to
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public."DocumentAcknowledgement"
  ADD COLUMN IF NOT EXISTS "sourceDocumentId"   text,
  ADD COLUMN IF NOT EXISTS "sourceDocumentName" text,
  ADD COLUMN IF NOT EXISTS "unsignedDocumentId" text,
  ADD COLUMN IF NOT EXISTS "signedDocumentId"   text;

NOTIFY pgrst, 'reload schema';

COMMIT;
