-- Migration: Add Payment table
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/hcilbqzipmpxqektvzgk/sql/new)

-- Create PaymentMethod enum
DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'WIRE_TRANSFER', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Payment table
CREATE TABLE IF NOT EXISTS "Payment" (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES "Client"(id) ON DELETE CASCADE,
  case_id TEXT REFERENCES "Case"(id) ON DELETE SET NULL,
  agreement_id TEXT REFERENCES "ServiceAgreement"(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  payment_method "PaymentMethod" NOT NULL DEFAULT 'OTHER',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_organization ON "Payment"(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_client ON "Payment"(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_case ON "Payment"(case_id);

-- Enable Row Level Security
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON TABLE "Payment" TO authenticated;
GRANT ALL ON TABLE "Payment" TO service_role;

-- Create RLS policies
CREATE POLICY "Users can view payments in their organization"
  ON "Payment" FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM "UserOrganization"
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments in their organization"
  ON "Payment" FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM "UserOrganization"
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments in their organization"
  ON "Payment" FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM "UserOrganization"
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments in their organization"
  ON "Payment" FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM "UserOrganization"
      WHERE user_id = auth.uid()
    )
  );

-- Refresh PostgREST schema cache so the API recognizes the new table
NOTIFY pgrst, 'reload schema';
