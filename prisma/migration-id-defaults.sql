-- Additive migration: DB-level defaults for TEXT primary keys that had none.
-- PostgREST inserts omitting "id" previously failed with NOT NULL violation
-- (Prisma cuid() defaults only exist client-side). gen_random_uuid() is built-in
-- on PG13+; explicit ids passed by callers still take precedence.
alter table if exists "ActivityLog"            alter column id set default gen_random_uuid();
alter table if exists "AiFeatureConfig"        alter column id set default gen_random_uuid();
alter table if exists "CRSScore"               alter column id set default gen_random_uuid();
alter table if exists "Case"                   alter column id set default gen_random_uuid();
alter table if exists "CaseTypeConfig"         alter column id set default gen_random_uuid();
alter table if exists "Client"                 alter column id set default gen_random_uuid();
alter table if exists "ComplianceLog"          alter column id set default gen_random_uuid();
alter table if exists "Document"               alter column id set default gen_random_uuid();
alter table if exists "IMMFormSubmission"      alter column id set default gen_random_uuid();
alter table if exists "IMMFormTemplate"        alter column id set default gen_random_uuid();
alter table if exists "Notification"           alter column id set default gen_random_uuid();
alter table if exists "NotificationPreference" alter column id set default gen_random_uuid();
alter table if exists "Organization"           alter column id set default gen_random_uuid();
alter table if exists "PNPDraw"                alter column id set default gen_random_uuid();
alter table if exists "Payment"                alter column id set default gen_random_uuid();
alter table if exists "RolePermission"         alter column id set default gen_random_uuid();
alter table if exists "ServiceAgreement"       alter column id set default gen_random_uuid();
alter table if exists "StripeEvent"            alter column id set default gen_random_uuid();
alter table if exists "Subscription"           alter column id set default gen_random_uuid();
alter table if exists "Task"                   alter column id set default gen_random_uuid();
alter table if exists "User"                   alter column id set default gen_random_uuid();
alter table if exists portal_submissions       alter column id set default gen_random_uuid();
