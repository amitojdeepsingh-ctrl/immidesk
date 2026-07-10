-- Migration: Add IntakeSubmission table for self-serve client intake forms
-- Run this in the Supabase Dashboard SQL Editor

-- Create IntakeStatus enum
DO $$ BEGIN
  CREATE TYPE "IntakeStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create IntakeSubmission table
CREATE TABLE IF NOT EXISTS "intake_submissions" (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT REFERENCES "Organization"(id) ON DELETE SET NULL,
  client_id TEXT,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  gender TEXT,
  nationality TEXT,
  passport_number TEXT,

  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT,

  marital_status TEXT DEFAULT 'single',
  spouse_first_name TEXT,
  spouse_last_name TEXT,
  spouse_dob TEXT,
  spouse_nationality TEXT,
  spouse_passport TEXT,
  children_data TEXT DEFAULT '[]',

  occupation TEXT,
  education_level TEXT,
  english_level TEXT,
  french_level TEXT,

  program_type TEXT,
  current_status TEXT,

  status "IntakeStatus" NOT NULL DEFAULT 'NEW',
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_intake_submissions_org ON "intake_submissions"(organization_id);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_status ON "intake_submissions"(status);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_submitted ON "intake_submissions"(submitted_at);

-- Enable Row Level Security
ALTER TABLE "intake_submissions" ENABLE ROW LEVEL SECURITY;

-- Grant access
GRANT ALL ON TABLE "intake_submissions" TO authenticated;
GRANT ALL ON TABLE "intake_submissions" TO service_role;

-- Allow anon insert (for the public intake form)
CREATE POLICY "anon_insert_intake_submissions"
  ON "intake_submissions" FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS for authenticated users
CREATE POLICY "users_select_intake_submissions"
  ON "intake_submissions" FOR SELECT
  USING (
    organization_id IN (
      SELECT "organizationId" FROM "User"
      WHERE "supabaseUserId" = auth.uid()::text
    )
  );

CREATE POLICY "users_update_intake_submissions"
  ON "intake_submissions" FOR UPDATE
  USING (
    organization_id IN (
      SELECT "organizationId" FROM "User"
      WHERE "supabaseUserId" = auth.uid()::text
    )
  );

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
