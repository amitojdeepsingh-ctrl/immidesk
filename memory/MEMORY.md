# ImmigDesk — Session Memory

## Current State (Session Aug 2026)
**Visual identity redesign SHIPPED (`82e8b6c`, 68 files)**: "Harbor Navy" brand system in
globals.css (Tailwind v4 @theme: brand-50 #F0F4FB → brand-950 #131D36; primary CTA = brand-600
#35599C light / brand-500 dark) + single maple-crimson accent (#C23A30, brand moments only:
plan ribbon/auth). Canonical pill recipe everywhere (tint fill + ink + inset ring). Status
progression: prep blues → lodged amber → in-process navy → emerald/red outcomes. All zinc CTAs
converted; layout/routing/APIs untouched; tsc+build verified.
**Portal pipeline fully fixed & live (uploads, emails, downloads). Finalization pass done:**
- **Case detail page `/cases/[id]`** NEW (`9a874a5`): status/priority selects (PATCH API extended
  to accept priority), key dates, IRCC/UCI, documents w/ presigned downloads + delete, task panel
  (add/complete/delete via /api/tasks), recent activity (userMap pattern, entityId filter).
  Cases list titles/View now deep-link to it; audit-log "case" links work.
- **DB defaults migration `prisma/migration-id-defaults.sql` APPLIED LIVE**: gen_random_uuid()
  default on 22 TEXT PKs that had none (Task, CRSScore, Payment, ActivityLog, Client, Case…).
  Fixes POST /api/tasks (was 500 null id), CRSScore create, Payment create, silent ActivityLog
  failures. Verified live in information_schema (22/22). PostgREST inserts may now omit id.
- **Audit-log dead links fixed**: task→/tasks, invoice→/invoices, consultation→/consultations (lists).
- **Prospects section REMOVED** (`143fef5`): page, /api/prospects/pipeline, sidebar entry,
  reports "Prospects CSV" button+enum case, notification-prefs category all deleted (live 404).
- **Knowledge Assistant tab ADDED** (`bf9cc15`): new `/knowledge` page (full-height grounded Q&A chat,
  6 topic cards w/ 25 starter questions, sources shown per answer), sidebar entry under AI Features.
  Knowledge base `src/lib/knowledge-base/entries.ts` expanded +30 grounded Canadian immigration
  entries (IRPA/IRPR structure, inadmissibility ss.33-42, misrep s.40, residency obligation s.28,
  PR card/PRTD, citizenship test + presence credit, refugee protection/claims/RAD, H&C s.25, PRRA,
  removal orders/ARC, rehabilitation/TRP, NOC TEER 2021, EE category draws, FSW grid, IEC, GTS,
  SUV, Self-Employed, AIP, Quebec CSQ/PEQ, dependant lock-in age, BOWP, visitor records, eTA,
  study PAL/funds $22,895 (Sept 2025), PGWP field/language rules, off-campus 24h). Medical
  excessive-demand figure aligned (~$28.2k/yr 2025). AI page: red test banner removed; links to /knowledge.
- **Client emails now carry PIS links** (`4f6fb21`): onboarding (clients/intake) + resend-links emails
  previously pointed only at `/portal/{token}` docs tab (and with broken relative base when
  NEXT_PUBLIC_APP_URL empty). Both now send Sign Agreement → Personal Information Sheet (/intake)
  → Upload Documents (/upload), origin-resolved. Sign-route next-steps email unchanged (`9b8ee3b`).
- Earlier this session: document downloads FIXED (`02c5a9d` — getPresignedDownloadUrl now uses
  service-role admin client; storage buckets have NO RLS policies so anon-client signing failed
  with "Object not found"); Resend API key replaced + RESEND_FROM_EMAIL set
  ("ADS Immigration <noreply@adsimmigration.com>", domain verified) in .env* AND Vercel prod.

## Commercialization (Aug 2026, `f7d3e23`)
- **Signup** collects company phone + RCIC number → Organization.phone / ciccRegistrationNumber.
- **Stripe billing LIVE-CAPABLE**: `/api/billing/checkout` (Checkout subscription; reuses Stripe
  customer from Subscription row) + `/api/billing/webhook` (signature-verified; syncs status/period;
  Stripe v22: period fields live on `sub.items.data[0]`, NOT sub root). Billing page plan cards have
  Upgrade buttons. TO GO LIVE: create 3 recurring Prices in Stripe dashboard, set env
  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_{SOLO,TEAM,FIRM}_PRICE_ID_USD in Vercel +
  add webhook endpoint https://immidesk.vercel.app/api/billing/webhook. Without keys → checkout
  returns 501 with clear message. Plans: $49 SOLO / $99 TEAM / $199 FIRM / Enterprise=mailto.
- **Company Profile editor** (`a2557e1`): Settings → editable CompanyProfileForm (name, contact email,
  phone, RCIC #, address, logo URL + preview) via PATCH /api/organization (owner/admin only).
  New `Organization.email` column (migration-org-email.sql, applied live) = white-label Reply-To;
  all client emails prefer org.email as Reply-To (sign-route previously wrongly used client's own email).
- **Branded emails**: resend.ts `orgSender({name,email})` — From display = firm name over the
  platform verified domain + Reply-To = firm email. Applied to welcome, resend-links, agreement
  sign confirmation + next-steps emails. TRUE own-domain sending (per-org Resend domain verify)
  is a future phase.

## Prior Session Fixes (Aug 17) — all deployed & verified
1. Upload 422 VALIDATION_ERROR (nullish notes/applicantLabel) `9aee6ed`
2. Upload 400 INVALID_PATH (UNSAFE_PATH_CHARS allow-list) `9aee6ed`
3. Upload 500 INSERT_FAILED null id → randomUUID() `6363ceb`
4. Intake 23505 multi-applicant (stale 2-col unique INDEX dropped) `6363ceb`
5. "Path contains unsafe characters" sanitizer emits [a-zA-Z0-9._-] `ffee5cf`
6. Email "View Case" 405 → /clients/{clientId} + request-origin base `ed1124c`
Infra: 4 storage buckets created; probe rows cleaned; migrate route wires all 5 migrations `1c127e9`.

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

## Missing / Gap Areas (updated Aug 17 finalize pass)
1. ~~Cases overview~~ DONE — list + `/cases/[id]` detail page
2. ~~Tasks UI~~ DONE — /tasks page + /api/tasks (create fixed by id-defaults migration)
3. ~~CRS Calculator~~ DONE — /crs + /api/crs/calculate
4. Reports exports — ALREADY IMPLEMENTED (/api/reports/export CSV, 6 types) — verify in browser
5. **Storage/DB RLS** — none enabled; app is service-role-everywhere behind requireAuth, so risk
   is low but defense-in-depth absent. Deliberately NOT bolted on during finalize (breakage risk).
6. In-app notifications UI, calendar, bulk ops, team invites — still open backlog.

## Next Steps (Priority Order)
1. Browser smoke-test the new /cases/[id] page + Tasks create (was broken before DB default fix).
2. Verify reports export buttons download real CSVs (endpoint exists; untested end-to-end).
3. Backlog: notifications bell → calendar → bulk ops → team invites → RLS hardening.
4. Optional: `vercel env` NEXT_PUBLIC_APP_URL already corrected locally; Vercel dashboard value
   no longer matters for email links (request-origin preferred).

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
| `src/lib/document-naming.ts` | UNSAFE_PATH_CHARS allow-list for validateStoragePath; sanitizeFileName now emits only `[a-zA-Z0-9._-]` base + safe extension |
| `src/lib/crs/__tests__/document-naming.test.ts` | Reg test: parens/commas/accents sanitized → paths pass validateStoragePath |
| `src/app/api/client-portal/upload/route.ts` | FIXED — nullish notes/applicantLabel + `id: randomUUID()` on Document insert; email "View Case" → `/clients/{clientId}` (request-origin base) |
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
| `src/lib/knowledge-base/entries.ts` | Knowledge base — ~54 grounded entries (IRPA/IRPR, programs, fees, timelines); keyword-searched by search.ts |
| `src/app/(dashboard)/knowledge/page.tsx` | Knowledge Assistant tab — full-page chat + topic browser |
| `src/lib/portal-token.ts` | Token verify utility |
| `IMMIDESK-PROJECT-DESCRIPTION.md` | Project overview for other AI agents |

## Git
- Remote: `github.com/amitojdeepsingh-ctrl/immidesk` (private)
- Branch: main
- Recent: `bf9cc15` (knowledge tab + KB expansion), `143fef5` (prospects removed), `9a874a5` (case detail + id-defaults migration + audit links), `02c5a9d` (download fix),
  `f36c12f`/`ed1124c` (email link), `ffee5cf` (sanitizer), `13c8c57`, `1c127e9`, `6363ceb`, `9aee6ed`.
  All pushed → auto-deploy to Vercel.
