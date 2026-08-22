-- Additive migration: Organization.contact email used as the white-label
-- Reply-To address on client-facing emails (subscribers' own inbox).
alter table "Organization" add column if not exists "email" text;
