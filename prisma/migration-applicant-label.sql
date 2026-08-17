-- Migration: Add applicantLabel to Document for per-applicant document labelling
-- Run this in the Supabase Dashboard SQL Editor
-- (Client-portal PIS multi-applicant work: docs are tagged PRIMARY | SPOUSE | CHILD#n)

ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "applicantLabel" TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_applicant_label ON "Document"("applicantLabel");

-- IMMFormSubmission is keyed (caseId, templateId, applicantLabel) for per-applicant
-- client-portal PIS submissions (PRIMARY | SPOUSE | CHILD#n)
ALTER TABLE "IMMFormSubmission"
  ADD COLUMN IF NOT EXISTS "applicantLabel" TEXT;

CREATE INDEX IF NOT EXISTS idx_imm_submissions_applicant_label ON "IMMFormSubmission"("applicantLabel");

-- Replace the legacy (caseId, templateId) unique key with the per-applicant composite
ALTER TABLE "IMMFormSubmission"
  DROP CONSTRAINT IF EXISTS "IMMFormSubmission_caseId_templateId_key";
ALTER TABLE "IMMFormSubmission"
  ADD CONSTRAINT "IMMFormSubmission_caseId_templateId_applicantLabel_key"
  UNIQUE ("caseId", "templateId", "applicantLabel");

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';