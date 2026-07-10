# ImmigDesk — Session Memory

## Current State (Session Jul 5, 2026)
**Vercel build: SUCCESS** — production at `https://immidesk.vercel.app`

## Dashboard Routes (11 pages)
| Route | Status |
|-------|--------|
| `/dashboard` | ✅ Moved from `(dashboard)/page.tsx` — stat cards |
| `/clients` | ✅ List + create + detail (cases, docs, messages) |
| `/agreements` | ✅ Created — lists all with signed/pending stats |
| `/payments` | ✅ Created — lists all with total received |
| `/lmia` | ✅ List + detail + leads source |
| `/newsletter` | ✅ Newsletters + send |
| `/leads` | ✅ List from Reddit/FB/Quora |
| `/invoices` | ✅ Invoice list with filtering |
| `/forms` | ✅ IMM form templates + submissions |
| `/draws` | ✅ Express Entry / PNP draw data |
| `/settings` | ✅ Org profile, team, preferences |

## Client Portal (3 token-gated areas)
- `/agreement/[token]` — sign service agreement
- `/portal/[token]` — intake form + messaging
- `/upload/[token]` — document upload
- Auth: HMAC-SHA256 signed token (NOT Supabase session)
- Notifications: PortalMessage → email notification to RCIC on each message
- Intake: 15+ fields stored on Client + immig data in notes JSON

## What's Been Done
### Recent (E2E testing + route fixes)
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
- `DATABASE_URL` password `pNS%3FYaFkwij9tX_` rejected for project `hcilbqzipmpxqektvzgk`
- Prisma migrations not yet applied to live DB
- Old `IMMIDESK` folder not yet renamed to `REVIEW-APP`

## Next Steps (Priority Order)
1. User disables Vercel Deployment Protection → verify auth + routes live
2. Resolve DATABASE_URL password or create new Supabase project
3. Run `prisma migrate dev --name init_immidesk_v2`
4. Enable RLS policies on all Supabase tables
5. Build top-priority features: Cases overview → Tasks UI → CRS Calculator
6. Add comprehensive test suite
7. Rename old IMMIDESK → REVIEW-APP

## Key Files
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | 20 models, 10 enums |
| `src/app/(dashboard)/dashboard/page.tsx` | Moved dashboard page |
| `src/app/(dashboard)/agreements/page.tsx` | New agreements list |
| `src/app/(dashboard)/payments/page.tsx` | New payments list |
| `src/components/layout/Sidebar.tsx` | Nav with 11 items |
| `src/app/api/client-portal/upload/route.ts` | Secure client upload (424 lines, HMAC token) |
| `src/app/api/client-portal/message/route.ts` | Client messaging + RCIC email notify |
| `src/app/api/client-portal/intake/route.ts` | Client intake form submission |
| `IMMIDESK-PROJECT-DESCRIPTION.md` | Project overview for other AI agents |
| `src/lib/portal-token.ts` | Token verify utility |

## Git
- Remote: `github.com/amitojdeepsingh-ctrl/immidesk` (private)
- Branch: main
