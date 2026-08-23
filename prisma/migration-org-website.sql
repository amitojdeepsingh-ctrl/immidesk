-- Organization.website: shown on client-facing branded pages
alter table "Organization" add column if not exists "website" text;
