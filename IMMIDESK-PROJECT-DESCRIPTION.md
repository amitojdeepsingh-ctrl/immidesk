# ImmigDesk — What Is This?

ImmigDesk is a web app for Canadian immigration consultants (RCICs). It helps them manage clients, applications, documents, payments, and communication — all from one place.

---

## Who Uses It?

Two types of users:

1. **Immigration Consultants (RCICs)** — log in to the dashboard to manage their practice
2. **Clients** — get a secure link via email to upload documents, sign agreements, and check their case status (no password needed)

---

## Tech Stack (Simple Terms)

| Piece | What We Use |
|-------|-------------|
| **Frontend** | Next.js + React — modern web framework |
| **Styling** | Tailwind CSS + shadcn/ui components |
| **Database** | PostgreSQL (hosted on Supabase) |
| **ORM** | Prisma — talks to the database |
| **Auth** | Supabase — handles login (email/password + Google) |
| **Payments** | Stripe — credit card subscriptions |
| **Email** | Resend — sends checklists, status updates, newsletters |
| **AI** | Claude (Anthropic) — writes Statement of Purpose letters, helps fill IRCC forms |
| **File Storage** | Supabase Storage — stores uploaded documents |
| **Hosting** | Vercel — serves the website |

---

## Features (What It Does)

### Dashboard
- Overview of all active cases, upcoming deadlines, recent activity

### Client CRM
- Add/edit clients with all their info (passport, nationality, contact, etc.)
- Track each client's immigration case through its entire lifecycle
- Soft-delete clients (archive instead of permanent delete — required by CICC rules)

### Case Management
- 23 types of Canadian immigration cases (Express Entry, Study Permit, Work Permit, Spousal Sponsorship, Refugee, Citizenship, etc.)
- 12-stage status pipeline: INTAKE → DOCUMENT COLLECTION → FORM FILLING → READY_TO_SUBMIT → SUBMITTED → AOR_RECEIVED → IN_PROCESS → ... → APPROVED/REFUSED/CLOSED
- Assign cases to team members
- Track IRCC application numbers, UCI, AOR dates, decision dates
- Tasks with due dates and assignees per case

### Document Management
- Clients upload documents via a secure portal link
- Consultants categorize documents (passport, education, language test, etc.)
- Files stored in cloud storage with signed URLs

### IRCC Forms
- Library of IRCC form templates
- Auto-fill forms from client/case data
- AI-assisted form filling (fills in hard-to-find fields)
- Fill real IRCC PDFs programmatically

### AI-Powered Tools
- **SOP Letter Generator** — Claude AI writes Statement of Purpose letters for study permits, Express Entry, etc.
- **IRCC Form Auto-Fill** — automatically fills out government forms
- **Lead Scoring** — detects which leads are most likely to convert

### Client Portal
- Clients get a magic link via email (HMAC-signed token, no password)
- They can: view their case status, upload documents, sign service agreements, send messages

### Service Agreements
- Generate engagement letters / retainer agreements as PDFs
- Clients sign digitally right in the browser
- Track fee amounts, payment schedules

### Payments
- Record payments (credit card, bank transfer, e-transfer, PayPal, Wise, cash, cheque)
- Stripe subscriptions for consultant plans
- Generate invoices

### Lead Management
- Import leads from spreadsheets
- Track leads from Reddit, Facebook, Quora, etc.
- Score leads by intent, generate pitch text
- Convert leads to clients

### LMIA Module
- Manage Labour Market Impact Assessment cases
- Track LMIA-specific leads

### Immigration News & Draws
- Daily scraper pulls immigration news from Canada.ca, CIC News, CanadaVisa
- Express Entry draw results (CRS scores, invitations)
- PNP draw history by province

### Compliance (CICC Rules)
- Audit log for everything: client intake, agreement signed, form submitted, communication, file closure
- Soft-delete instead of hard delete
- Financial records can't be deleted once created
- Money stored as exact Decimal (not Float) for audit accuracy

### Email
- Send document checklists to clients
- Notify clients of submission updates
- Send newsletters to client list

### Notifications
- In-app notifications for consultants (new uploads, status changes, etc.)

### Newsletter
- Create and send email newsletters to clients

---

## Database Structure (Simplified)

**Main tables:**
- **Organization** — the consulting firm (name, CICC registration, address)
- **User** — team members (owner, admin, member roles)
- **Client** — each client (personal info, linked to one organization)
- **Case** — each immigration application (type, status, priority, assigned to a user, linked to a client)
- **Document** — uploaded files (linked to case + who uploaded it)
- **ServiceAgreement** — retainer/engagement letter (amount, status, signed/unsigned)
- **Payment** — money received (amount, method, date, linked to client + case + agreement)
- **Task** — to-do items per case (title, due date, assignee)
- **Lead** — potential clients from social media
- **IMMFormSubmission** — filled IRCC forms per case
- **ImmigrationNews** — scraped news articles
- **ComplianceLog** — audit trail for CICC
- **Subscription** — which plan an org is on (Stripe)
- **Notification** — in-app alerts
- **ActivityLog** — every action logged for audit

---

## How Auth Works

**For Consultants (dashboard):**
- Login with email/password or Google
- Session stored in cookies via Supabase SSR
- `requireAuth()` checks you're logged in before showing dashboard pages

**For Clients (portal):**
- Consultant sends a magic link via email
- Link contains an HMAC-signed token (encodes client ID + case ID + org ID + expiry)
- No password needed — the token IS the credential
- Used for: viewing case status, uploading documents, signing agreements

---

## Pricing

| Plan | Monthly | Storage | Users |
|------|---------|---------|-------|
| SOLO | ~$29 | 5GB | 1 |
| TEAM | ~$79 | 25GB | up to 5 |
| FIRM | ~$199 | 50GB | unlimited |
| ENTERPRISE | custom | 100GB | custom |

Billed monthly via Stripe, free trial included.

---

## Where It's Hosted

- **Live at**: `https://immidesk.vercel.app`
- **GitHub repo**: `github.com/amitojdeepsingh-ctrl/immidesk` (private)
- **Database**: Supabase project `hcilbqzipmpxqektvzgk`
- **News scraper**: Runs daily at 9 AM via Vercel Cron

---

## Current Status

- All features built and working
- Deploys successfully to Vercel
- Just need to:
  - Apply the latest database schema changes
  - Test that Google login works with fresh env vars
  - Turn off Vercel's login-wall for anonymous visitors
  - Enable database security rules
