# ImmigDesk — Session Memory

## Current State (Session Aug 17, 2026)
**All currently-known client-portal upload + multi-applicant intake bugs FIXED and VERIFIED LIVE on `https://immidesk.vercel.app`.**
**Migrate route now wires ALL 5 migrations (`v2`, `intake`, `consultations`, `payment`, `applicant-label`) with a robust dollar-quote/comment-aware SQL splitter.**
Fixed this session (4 source fixes + 3 infra fixes), all deployed & e2e-probed:

1. **Upload 422 `VALIDATION_ERROR`** (notes/applicantLabel "expected string, received null") — old/browserless
   uploads send no `notes`/`applicantLabel`; schema required them. FIX: `.nullish().default("")` +
   `transform((v)=>(v??"").trim().toUpperCase())` on both fields in `upload/route.ts` schema. `9aee6ed`.
2. **Upload 400 `INVALID_PATH`** — `validateStoragePath` used `UNSAFE_FILENAME_CHARS` (contains `/`, and a
   stateful `/g` flag) against the FULL path which always contains `/` → false-invalid every time. FIX:
   new `UNSAFE_PATH_CHARS = /[^A-Za-z0-9._/-]/` allow-list in `src/lib/document-naming.ts`; traversal/ctrl/spaces still rejected. `9aee6ed`.
3. **Upload 500 `INSERT_FAILED` null `Document.id`** — Document table has NO DB default for `id`
   (PostgREST doesn't run Prisma `cuid()`); route inserted without `id`. FIX: `id: randomUUID()` +
   import in `upload/route.ts`. `6363ceb`.
4. **Intake 500 on 2nd applicant (SPOUSE/CHILD#n)** — stale bare UNIQUE INDEX
   `IMMFormSubmission_caseId_templateId_key` (2-col) blocked multi-applicant inserts with
   `23505 duplicate key ... "IMMFormSubmission_caseId_templateId_key"`. The migration `DROP CONSTRAINT`
   missed it because it's a bare index, NOT in `pg_constraint` (Prisma drift). FIX: `DROP INDEX IF EXISTS`
   both in DB and in `prisma/migration-applicant-label.sql`. Verified via PostgREST spouse+child inserts. `6363ceb`.

Infra fixes (Supabase, not code):
- Created 4 missing storage buckets: `client-documents`, `generated-forms`, `organization-logos`,
  `compliance-exports` (project only had `immigdesk-documents`/`immigdesk-data` → upload failed `Bucket not found`).
- Cleaned leaked probe rows: `IMMFormSubmission` d722d66e + probe Case c769be5c + probe docs + storage objects.

Live E2E verification (probe-e2e.cjs, deleted after): intake 200 (PRIMARY+CHILD rows), modern upload 201,
old-browser upload 201, cleanup OK.

## Recent Session (Aug 17) — What was done
- **Root-caused upload 422/INVALID_PATH** by live-probing the deployed endpoint with old-browser
  FormData (confirm: 422 on notes/applicantLabel; then 400 INVALID_PATH after schema toleration).
- **Found bare-index drift**: pooler showed `(caseId,templateId,applicantLabel)` unique but PostgREST
  still 409'd on `(caseId,templateId)` — the 2-col UNIQUE INDEX survived (pg_constraint vs pg_indexes).
- **Verified secret/env matching**: `.env` + `.env.production` secrets MATCH live deploy; `.env.vercel`/
  `.env.example` do NOT (225-char service key ≠ 219-char). Live token uploads only work with the `.env`
  secret. `NEXT_PUBLIC_APP_URL` in `.env` is `http://localhost:3000` — override to
  `https://immidesk.vercel.app` when probing live via fetch.
- **db check**: tables `id` columns are all TEXT with NO default — any `.insert({...})` via PostgREST
  MUST supply `id` explicitly (intake does; upload route previously didn't).
- Cleanup: all probe-*.cjs / scan-*.cjs / scratch removed. Working tree clean.
- Applied `additive-v3-migration.sql` earlier (docs below) via pooler; `prisma migrate diff` still times out — use raw SQL.

## Vision
- `/intake/[token]` — Personal Information Sheet w/ 4-step wizard + per-applicant branching
- `/upload/[token]` — doc upload with "who is this for?" applicant selector
- Dashboard client detail — new **Family & Intake** section listing per-applicant submissions
- `Document.applicantLabel` — additive nullable column (migration in `prisma/migration-applicant-label.sql`)


## What's Been Done
### Recent (Multi-applicant PIS intake)
- `/api/migrate/route.ts` — NOW multi-migration: ordered def list (`payment`, `applicant-label`), idempotency check per migration via information_schema, applies only pending ones; `?dry-run=true` returns SQL for all migrations (DB-free)
- `src/lib/intake/pis-schema.ts` — NEW single source of truth: `PIS_SECTIONS` (9 sections), `PIS_PROGRAMS` (10), `STATUTORY_QUESTIONS` (18), repeater types, `ApplicantDraft`/`ApplicantRole`, `PIS_APPLICANT_SECTIONS`/`PIS_PRIMARY_EXTRA_SECTIONS`
- `src/app/(client-portal)/intake/[token]/intake-form.tsx` — REWRITTEN: 4-step wizard (Program → Primary → Spouse & Dependants → Review), WillApplyToggle, statutory Q-block, education/employment/travel/address repeaters, lazy `childPisEditors`
- `src/app/(client-portal)/intake/[token]/page.tsx` — NOW server-verifies token (`verifyPortalToken`), fetches Client + Case + org, prefills from existing submissions
- `src/app/api/client-portal/intake/route.ts` — REWRITTEN: self-healing IMM_PIS template (`ensurePisTemplate`), updates Client from primary PIS, upserts one submission per applicant keyed `(caseId, templateId, applicantLabel)`, advances Case INTAKE → DOCUMENT_COLLECTION
- `Document.applicantLabel` added to `prisma/schema.prisma` (+ `@@index`) + `prisma/migration-applicant-label.sql`
- `src/app/api/client-portal/upload/route.ts` + `(client-portal)/upload/[token]/client-portal-upload-form.tsx` — accept `applicantLabel` (SPOUSE/CHILD#n/PRIMARY); tagged into filename + Document row
- `src/components/documents/DocumentList.tsx` — new Applicant column (Main applicant / Spouse / Child n)
- `src/app/(dashboard)/clients/[id]/page.tsx` + `client-detail-view.tsx` — Family & Intake section (per-applicant rows: role, name, will-apply, case, status)
- `(dashboard)/clients/[id]/documents/page.tsx` — passes `applicantLabel` through

### Prior (E2E testing + route fixes)
- E2E test with Playwright (Python): 14/17 passed initially
- 3 missing routes found & fixed:
  - `/dashboard` (404 due to route-group conflict with root page.tsx) → moved to `(dashboard)/dashboard/page.tsx`
  - `/agreements` → created agreements list page
  - `/payments` → created payments list page
- Updated Sidebar nav with Dashboard, Agreements, Payments
- Test user: persisted in Supabase Auth + User table, then cleaned up
- Landing page Dashboard button → links to `/dashboard`

### Prior (Build + Schema + Security)
- Fixed Vercel build: `postinstall: "prisma generate"` added
- Locked `/api/migrate` behind `MIGRATE_SECRET`
- Applied full v2 schema corrections (20 models, 10 enums)
- Fixed Google auth & callback routes (env var crashes at build-time)
- Protected all env var reads with null guards
- Fixed 28 ESLint errors (0 errors, 56 warnings remaining)
- Created `IMMIDESK-PROJECT-DESCRIPTION.md` (detailed + simple English)
- Git auto-deploys to Vercel from `main` branch

### Codebase Audit — Feature Inventory
**Existing:**
- Clients CRM: CRUD, search, soft-delete, tags
- Cases: full lifecycle (INTAKE → DOCUMENT_COLLECTION → FORM_FILLING → READY_TO_SUBMIT → SUBMITTED → AOR_RECEIVED → IN_PROCESS → APPROVED/REFUSED → CLOSED)
- Documents: Supabase Storage, category system, notes, version tracking
- IMM Forms: 10+ form templates, PDF fill pipeline
- Agreements: e-sign via portal, fee tracking, PDF storage
- Payments: multi-method (credit, e-transfer, bank, etc.), linked to agreements
- LMIA: tracking + leads source parser
- Leads: scraped from Reddit/FB/Quora with intent scoring
- News/Draws: auto-fetched Express Entry + PNP data
- Newsletter: compose + send via Resend
- Activity Logging: granular per-action audit trail
- Compliance Logs: per-event type with metadata
- Notifications: DB model exists (no real-time delivery UI)
- Tasks: DB model exists (no UI)
- CRS Scores: DB model stores results (no calculator UI)
- Subscriptions: Stripe integration framework (partial)

**Missing / Gap Areas:**
1. **Cases overview page** — cases only browsable per-client currently
2. **Tasks/Deadlines UI** — model exists but no create/complete/view pages
3. **CRS Calculator** — model stores scores; no calculator frontend
4. **In-app Notifications** — Notification model has no bell/panel UI; no real-time push
5. **Calendar/Scheduling** — no appointments, deadline calendar
6. **Client Timeline** — no unified interaction history per client
7. **Reports/Dashboard Charts** — no analytics, case stats, revenue graphs
8. **Bulk Operations** — no bulk email, bulk status change
9. **Team Invites** — no invite-by-email flow for org members
10. **Security: RLS** — none enabled on Supabase tables yet
11. **No test suite** — zero unit, integration, or E2E tests in repo

## Blocked
- Vercel Deployment Protection blocks anonymous access — user must disable in Vercel Dashboard
  (Note: `.env`-keyed HMAC tokens still pass live — invalid tokens now 401, valid tokens 200).
- Direct DB host `db.hcilbqzipmpxqektvzgk.supabase.co` DNS fails intermittently (`getaddrinfo ENOTFOUND`) — **use transaction pooler `aws-1-ca-central-1.pooler.supabase.com:6543`** (user `postgres.hcilbqzipmpxqektvzgk`) for all DB work, incl. DDL
- `prisma migrate diff` / introspection over pooler times out — verify schema via raw SQL instead
- Old `IMMIDESK` folder not yet renamed to `REVIEW-APP`
- `immigdesk-documents` / `immigdesk-data` buckets are legacy/unused by code (code uses the 4 `client-documents` etc.) — leave as-is

## Next Steps (Priority Order)
1. **DONE**: Portal upload (both browser + legacy) + multi-applicant intake verified live (200/201).
2. **DONE**: Migrate route wires `v2`/`intake`/`consultations`/`payment`/`applicant-label`; SQL splitter
   now dollar-quote + single-quote + line-comment aware (old naive `split(";")` would corrupt `DO $$` blocks).
   Live DB verified: all tables + `UserRole` enum values already present → route now reports all applied.
3. Re-test the actual browser flow end-to-end if the user wants: upload `IMM5739_1-16GBO03B.pdf` with
   category "Immigration Form" + fill spouse/dependant on `/portal/[token]` → both should now succeed.
4. Consider renaming `prisma/migrations` (empty) vs raw SQL convention; `prisma db push` still
   requires `--accept-data-loss` → always additive.
5. Then backlog: Cases overview → Tasks UI → CRS Calculator → RLS

## Connection Quick Reference
- Pooler (USE THIS): `postgres` @ `aws-1-ca-central-1.pooler.supabase.com:6543`, user `postgres.hcilbqzipmpxqektvzgk`, pw `ImmiDeskMjAyNiE=Rc3t`
- Direct: `postgres` @ `db.hcilbqzipmpxqektvzgk.supabase.co:5432` (DNS flaky)
- Management API PAT (REVOKED — was committed in an earlier push; see memory note; do not re-commit)
- `.env`/`.env.production`/`.env.vercel` updated; deployed `https://immidesk.vercel.app`
- Storage buckets (created live): `client-documents`, `generated-forms`, `organization-logos`, `compliance-exports`
- All PK `id` columns are TEXT, NO DEFAULT → every PostgREST `.insert()` must pass `id: randomUUID()`

## Key Files
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | 20 models, 10 enums (+ Document.applicantLabel) |
| `src/lib/document-naming.ts` | UNSAFE_PATH_CHARS allow-list for validateStoragePath (was false-INVALID_PATH) |
| `src/app/api/client-portal/upload/route.ts` | FIXED — nullish notes/applicantLabel + `id: randomUUID()` on Document insert |
| `src/lib/intake/pis-schema.ts` | PIS sections/statutory/applicant types (single source of truth) |
| `src/app/(client-portal)/portal/[token]/portal-tab-docs.tsx` | FIXED — category dropdown from enum + spouse/dependant intake + correct payload |
| `src/app/(client-portal)/intake/[token]/intake-form.tsx` | 4-step multi-applicant PIS wizard |
| `src/app/(client-portal)/intake/[token]/page.tsx` | Server token verify + prefill + public header |
| `src/app/api/client-portal/intake/route.ts` | Per-applicant persistence + IMM_PIS self-heal (generates id) |
| `src/app/api/migrate/route.ts` | ALL 5 migrations wired; dollar-quote/comment-aware SQL splitter |
| `prisma/migration-applicant-label.sql` | Document.applicantLabel + drops stale 2-col unique INDEX |
| `src/lib/storage.ts` | Bucket helpers (4 buckets now created live) |
| `src/components/documents/DocumentList.tsx` | Applicant column |
| `src/app/(dashboard)/clients/[id]/client-detail-view.tsx` | Family & Intake section |
| `src/app/api/client-portal/message/route.ts` | Client messaging + RCIC email notify |
| `src/lib/portal-token.ts` | Token verify utility |
| `IMMIDESK-PROJECT-DESCRIPTION.md` | Project overview for other AI agents |

## Git
- Remote: `github.com/amitojdeepsingh-ctrl/immidesk` (private)
- Branch: main
- Recent: `1c127e9` (wire all 5 migrations + robust splitter), `6363ceb` (upload id fix + migration drop-index),
  `9aee6ed` (422/INVALID_PATH), `2bd32cc` (portal UI + enum). Pushed through `6363ceb` → auto-deploy to Vercel.
