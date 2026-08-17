# ImmigDesk — Session Memory

## Current State (Session Aug 17, 2026)
**Portal bugs FIXED (both reported today); migration + intake smoke PASSED earlier today.**
Fixed (in `portal-tab-docs.tsx`, the `/portal/[token]` Documents tab):
1. **Upload "Invalid input"** — dropdown sent values not in `DocumentCategory` enum
   (`EMPLOYMENT`, `POLICE_CERT`, `RELATIONSHIP`, and `IMMIGRATION_FORM` was missing from the
   enum entirely). Route validates via `z.nativeEnum(DocumentCategory)` → rejected.
   FIX: added `IMMIGRATION_FORM` to enum in `src/types/index.ts`, `prisma/schema.prisma`,
   `src/lib/document-naming.ts` label map, AND live DB (`ALTER TYPE ... ADD VALUE` via pooler,
   done + verified). Replaced the hardcoded `<select>` with a dropdown derived from
   `DocumentCategory`/`DocumentCategoryLabel`.
2. **No spouse/dependant questions** — "Your Info" step collected only a spouse *name* and no
   dependants. Also `submitIntake` posted a flat object the intake API ignores (API expects
   `intake.primary`/`intake.family`), so nothing was saved.
   FIX: full spouse section (first/last name, DOB, nationality, will-apply) shown when
   Married/Common-law + repeatable Dependants (children) section; `submitIntake` now builds
   proper `ApplicantDraft[]` (PRIMARY + SPOUSE + CHILD#n) → persisted as IMMFormSubmission rows.
Typecheck ✅, `npm run build` ✅, vitest ✅ (21 passed), no NEW lint issues in edited files.
Not yet deployed to Vercel.

## Recent Session (Aug 17) — What was done
- **Applied `additive-v3-migration.sql`** via `run-migration-pooler.ts` (direct host
  `db.hcilbqzipmpxqektvzgk.supabase.co` DNS is flaky — **always use pooler**
  `aws-1-ca-central-1.pooler.supabase.com:6543` for DDL). Migration OK in 458 ms.
- **Verified** (query against pooler): `Task`, `Payment`, `Notification` +
  recreated `CaseTypeConfig`/`RolePermission`/`NotificationPreference`/`AiFeatureConfig`
  tables exist; `Client.deletedAt`/`isArchived`, `Case.assignedToId`/`deletedAt`/`isArchived`
  added; `Case.decisionResult` now `USER-DEFINED` (enum); all 6 new enums present; FKs OK.
- **Smoke seed** (`smoke-intake.ts`, kept in repo root): `PrismaClient` from
  `./generated/prisma/client` + `PrismaPg` adapter (matches `src/lib/prisma.ts`). First
  run failed on `caseType: "TEMPORARY_RESIDENT"` (not a valid enum value) → switched to
  `WORK_PERMIT`. Client create (the old `isArchived` blocker) now succeeds.
- **Cleanup**: deleted 3 `smoke-*` orgs + children (FK-safe order: case→client→org),
  removed scratch scripts (`run-migration*.ts`, `verify-migration.ts`, `cleanup-smoke.ts`,
  `show-models.cjs`, `enum-casetype.ts`, `list-tables.ts`), deleted stale `db-current.prisma`.
- **Remaining drift** (intentional, NOT to be "fixed"): `LmiaAd/LmiaApplicant/LmiaCase/
  LmiaLead/PortalMessage/portal_submissions` live REST features not in schema;
  `Consultation`/`AvailabilityRule` snake_case (code queries snake_case — leave as-is);
  `UserRole.MEMBER` unused value; `immigration/lead/intake_submissions` tweaks non-blocking.
- **`prisma migrate diff` over pooler TIMES OUT** — don't use it for verification; use
  direct SQL queries via `pg` instead.
- **Live `DocumentCategory` enum now**: PASSPORT, EDUCATION, LANGUAGE_TEST, WORK_EXPERIENCE,
  FINANCIAL, MEDICAL, POLICE_CERTIFICATE, PHOTO, MARRIAGE_CERTIFICATE, BIRTH_CERTIFICATE,
  OTHER, INSURANCE, INVITATION, IDENTITY, WORK_PERMIT, IMMIGRATION_FORM (16 values).

## Vision
- `/intake/[token]` — Personal Information Sheet w/ 4-step wizard + per-applicant branching
- `/upload/[token]` — doc upload with "who is this for?" applicant selector
- Dashboard client detail — new **Family & Intake** section listing per-applicant submissions
- `Document.applicantLabel` — additive nullable column (migration in `prisma/migration-applicant-label.sql`, NOT yet applied to DB)
- `/portal/[token]` Documents tab — now asks for spouse + dependants on "Your Info" step, and
  persists per-applicant submissions via `/api/client-portal/intake`


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
- Direct DB host `db.hcilbqzipmpxqektvzgk.supabase.co` DNS fails intermittently (`getaddrinfo ENOTFOUND`) — **use transaction pooler `aws-1-ca-central-1.pooler.supabase.com:6543`** (user `postgres.hcilbqzipmpxqektvzgk`) for all DB work, incl. DDL
- `prisma migrate diff` / introspection over pooler times out — verify schema via raw SQL instead
- Old `IMMIDESK` folder not yet renamed to `REVIEW-APP`

## Next Steps (Priority Order)
1. **Done**: additive migration applied; smoke seed org→client→case→token→intake PASSED (HTTP 200)
2. **DONE**: portal bugs fixed (category enum mismatch + spouse/dependants intake). **NEXT: deploy to Vercel and re-test** on `https://immidesk.vercel.app/portal/[token]`:
   - upload `IMM5739_1-16GBO03B.pdf` with category "Immigration Form" → expect success (no "Invalid input")
   - fill "Your Info" with spouse + a dependant → expect `/api/client-portal/intake` to persist PRIMARY/SPOUSE/CHILD#1 submission rows
3. Wire v2 scripts (`migration-v2.sql`, `migration-intake.sql`, `migration-consultations.sql`, `migration-payment.sql`, `applicant-label`) into `src/app/api/migrate/route.ts` MIGRATIONS list for idempotent future runs
4. Consider renaming `prisma/migrations` (empty) vs raw SQL convention; `prisma db push` still requires `--accept-data-loss` → always additive
5. Then backlog: Cases overview → Tasks UI → CRS Calculator → RLS

## Connection Quick Reference
- Pooler (USE THIS): `postgres` @ `aws-1-ca-central-1.pooler.supabase.com:6543`, user `postgres.hcilbqzipmpxqektvzgk`, pw `ImmiDeskMjAyNiE=Rc3t`
- Direct: `postgres` @ `db.hcilbqzipmpxqektvzgk.supabase.co:5432` (DNS flaky)
- Management API PAT (REVOKED — was committed in an earlier push; see memory note; do not re-commit)
- `.env`/`.env.production`/`.env.vercel` updated; deployed `https://immidesk.vercel.app`

## Key Files
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | 20 models, 10 enums (+ Document.applicantLabel) |
| `src/lib/intake/pis-schema.ts` | NEW — PIS sections/statutory/applicant types (single source of truth) |
| `src/app/(client-portal)/portal/[token]/portal-tab-docs.tsx` | FIXED — category dropdown from enum + spouse/dependant intake + correct payload |
| `src/app/(client-portal)/intake/[token]/intake-form.tsx` | 4-step multi-applicant PIS wizard |
| `src/app/(client-portal)/intake/[token]/page.tsx` | Server token verify + prefill + public header |
| `src/app/api/client-portal/intake/route.ts` | Per-applicant persistence + IMM_PIS self-heal |
| `prisma/migration-applicant-label.sql` | NEW — Document.applicantLabel (pending apply) |
| `src/components/documents/DocumentList.tsx` | Applicant column |
| `src/app/(dashboard)/clients/[id]/client-detail-view.tsx` | Family & Intake section |
| `src/app/api/client-portal/upload/route.ts` | Secure client upload (HMAC token + applicantLabel) |
| `src/app/api/client-portal/message/route.ts` | Client messaging + RCIC email notify |
| `src/lib/portal-token.ts` | Token verify utility |
| `IMMIDESK-PROJECT-DESCRIPTION.md` | Project overview for other AI agents |

## Git
- Remote: `github.com/amitojdeepsingh-ctrl/immidesk` (private)
- Branch: main
