-- Additive-only migration: bring live DB to schema.prisma parity
-- SKIPS (data preserved / intentionally untouched):
--   * LmiaAd/LmiaApplicant/LmiaCase/LmiaLead/PortalMessage/portal_submissions (live REST features, not in schema)
--   * Consultation / AvailabilityRule (code queries them with snake_case; leave working as-is)
--   * UserRole enum: MEMBER value kept (no Prisma reference; harmless)
--   * ImmigrationNews / Lead / intake_submissions default/type tweaks (non-blocking)
-- Recreates (empty tables, matches schema exactly): CaseTypeConfig, RolePermission,
--   NotificationPreference, AiFeatureConfig — fixes camelCase REST endpoints that were broken.

-- 1. New enums
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'E_TRANSFER', 'WISE', 'CASH', 'CHEQUE', 'OTHER');
CREATE TYPE "DecisionResult" AS ENUM ('APPROVED', 'REFUSED', 'WITHDRAWN', 'ABANDONED', 'OTHER');
CREATE TYPE "NotificationEvent" AS ENUM ('TASK_OVERDUE', 'TASK_DUE_TOMORROW', 'TASK_ASSIGNED', 'CASE_STATUS_CHANGED', 'DOCUMENT_UPLOADED', 'DOCUMENT_EXPIRING', 'RETAINER_SIGNED', 'PROSPECT_ASSIGNED', 'FOLLOW_UP_REACHED', 'INVOICE_OVERDUE', 'PAYMENT_RECEIVED', 'CONSULTATION_BOOKED', 'CONSULTATION_REMINDER');
CREATE TYPE "Permission" AS ENUM ('CASES_VIEW', 'CASES_CREATE', 'CASES_EDIT', 'CASES_DELETE', 'CLIENTS_VIEW', 'CLIENTS_CREATE', 'CLIENTS_EDIT', 'CLIENTS_DELETE', 'DOCUMENTS_VIEW', 'DOCUMENTS_UPLOAD', 'DOCUMENTS_DELETE', 'TASKS_VIEW', 'TASKS_CREATE', 'TASKS_EDIT', 'TASKS_DELETE', 'INVOICES_VIEW', 'INVOICES_CREATE', 'INVOICES_EDIT', 'INVOICES_DELETE', 'CONSULTATIONS_VIEW', 'CONSULTATIONS_CREATE', 'CONSULTATIONS_EDIT', 'REPORTS_VIEW', 'REPORTS_EXPORT', 'SETTINGS_VIEW', 'SETTINGS_EDIT', 'TEAM_VIEW', 'TEAM_MANAGE', 'BILLING_VIEW', 'BILLING_MANAGE');
CREATE TYPE "AiFeatureType" AS ENUM ('DOCUMENT_ANALYST', 'COMMUNICATION_DRAFTER', 'CASE_ASSESSOR', 'FORM_AUTO_FILLER', 'SUBMISSIONS_WRITER', 'KNOWLEDGE_ASSISTANT', 'COMPLIANCE_MONITOR');
CREATE TYPE "ConsultationStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- 2. Existing enum extensions (values not present in current DB)
ALTER TYPE "CaseType" ADD VALUE IF NOT EXISTS 'SPOUSAL_SPONSORSHIP';
ALTER TYPE "CaseType" ADD VALUE IF NOT EXISTS 'SPOUSAL_OWP';
ALTER TYPE "CaseType" ADD VALUE IF NOT EXISTS 'SUPER_VISA';
ALTER TYPE "CaseType" ADD VALUE IF NOT EXISTS 'TRP';
ALTER TYPE "CaseType" ADD VALUE IF NOT EXISTS 'REFUGEE';
ALTER TYPE "CaseType" ADD VALUE IF NOT EXISTS 'VULNERABLE_WORKER';
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'INSURANCE';
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'INVITATION';
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'IDENTITY';
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'WORK_PERMIT';

-- 3. Client: add v2 columns (critical smoke-test blocker)
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- 4. Case: add v2 columns + type decisionResult to enum (all values null -> safe)
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Case' AND column_name='decisionResult' AND data_type='text') THEN
    ALTER TABLE "Case" ALTER COLUMN "decisionResult" TYPE "DecisionResult" USING NULL::"DecisionResult";
  END IF;
END $$;

-- 5. ServiceAgreement feeAmount -> Decimal(65,30) (matches Prisma Decimal)
ALTER TABLE "ServiceAgreement" ALTER COLUMN "feeAmount" SET DATA TYPE DECIMAL(65,30);

-- 6. New tables: Task, Payment, Notification
CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "caseId" TEXT,
    "agreementId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "receiptNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- 7. Recreate empty v2 config tables exactly per schema (fixes broken camelCase REST endpoints)
DROP TABLE IF EXISTS "CaseTypeConfig";
DROP TABLE IF EXISTS "RolePermission";
DROP TABLE IF EXISTS "NotificationPreference";
DROP TABLE IF EXISTS "AiFeatureConfig";

CREATE TABLE "CaseTypeConfig" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "caseType" "CaseType" NOT NULL,
    "documentTemplates" JSONB NOT NULL DEFAULT '[]',
    "caseStages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "RolePermission" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permission" "Permission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "NotificationPreference" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "AiFeatureConfig" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "featureType" "AiFeatureType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Indexes for new + recreated tables
CREATE INDEX IF NOT EXISTS "Task_caseId_idx" ON "Task"("caseId");
CREATE INDEX IF NOT EXISTS "Task_assignedToId_idx" ON "Task"("assignedToId");
CREATE INDEX IF NOT EXISTS "Task_dueDate_idx" ON "Task"("dueDate");
CREATE INDEX IF NOT EXISTS "Payment_organizationId_idx" ON "Payment"("organizationId");
CREATE INDEX IF NOT EXISTS "Payment_clientId_idx" ON "Payment"("clientId");
CREATE INDEX IF NOT EXISTS "Payment_caseId_idx" ON "Payment"("caseId");
CREATE INDEX IF NOT EXISTS "Payment_agreementId_idx" ON "Payment"("agreementId");
CREATE INDEX IF NOT EXISTS "Payment_paymentDate_idx" ON "Payment"("paymentDate");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE UNIQUE INDEX IF NOT EXISTS "CaseTypeConfig_organizationId_caseType_key" ON "CaseTypeConfig"("organizationId", "caseType");
CREATE INDEX IF NOT EXISTS "CaseTypeConfig_organizationId_idx" ON "CaseTypeConfig"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_organizationId_role_permission_key" ON "RolePermission"("organizationId", "role", "permission");
CREATE INDEX IF NOT EXISTS "RolePermission_organizationId_role_idx" ON "RolePermission"("organizationId", "role");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_event_key" ON "NotificationPreference"("userId", "event");
CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "AiFeatureConfig_organizationId_featureType_key" ON "AiFeatureConfig"("organizationId", "featureType");
CREATE INDEX IF NOT EXISTS "AiFeatureConfig_organizationId_idx" ON "AiFeatureConfig"("organizationId");

-- 9. Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Case_assignedToId_fkey') THEN
    ALTER TABLE "Case" ADD CONSTRAINT "Case_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Task_caseId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Task_assignedToId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Payment_organizationId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Payment_clientId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Payment_caseId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Payment_agreementId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "ServiceAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Lead_organizationId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CaseTypeConfig_organizationId_fkey') THEN
    ALTER TABLE "CaseTypeConfig" ADD CONSTRAINT "CaseTypeConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='RolePermission_organizationId_fkey') THEN
    ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='NotificationPreference_userId_fkey') THEN
    ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='AiFeatureConfig_organizationId_fkey') THEN
    ALTER TABLE "AiFeatureConfig" ADD CONSTRAINT "AiFeatureConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Notification_userId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Notification_clientId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;