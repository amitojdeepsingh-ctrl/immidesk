# ImmigDesk — Technical Specification

The spec is written. Here's what you've got:

**[Knowledge/immigdesk-technical-spec.md](C:/Users/amito/OpenCode-Work/projects/review-manager/agentic-os/Knowledge/immigdesk-technical-spec.md)** — 1,760 lines, 61K chars, 10 sections + 3 appendices.

**What's inside:**

| Section | Highlights |
|---|---|
| **1. Architecture** | Mermaid system diagram, tech rationale table, full project tree, IMM form fill sequence diagram |
| **2. Database Schema** | 12 Prisma models, 9 enums, ERD diagram, RLS policies, index strategy — every relation and constraint specified |
| **3. API Endpoints** | 40+ endpoints across 10 resource groups with method, path, auth, and rate limits. Response envelope convention documented |
| **4. Frontend Routes** | Complete route tree, layout architecture (auth vs dashboard groups), 40+ component inventory, IMM form filler wireframe |
| **5. Authentication** | Supabase Auth flow diagrams (signup/login/request), middleware implementation, RBAC table, session management |
| **6. Payments** | Stripe sequence diagram, 4-tier pricing (USD + INR), 6 webhook events handled, full webhook handler code |
| **7. File Storage** | 4 Supabase buckets, path convention, RLS storage policies, presigned upload flow with plan limit enforcement |
| **8. Email** | Resend integration, 9 email triggers with timing, cron job implementation for deadline reminders |
| **9. Error Handling** | 3-layer strategy (React boundaries, API envelope, Sentry), AppError class, 5 monitoring alerts, health check endpoint |
| **10. 5-Day Build Plan** | 52 tasks across 5 days with time estimates and deliverables — Day 1 auth → Day 5 production deploy |
| **Appendices** | All env vars, full package.json dependencies, IMMFormTemplate field schema TypeScript types |

The IMM form auto-fill engine — the product's killer feature — has its own sequence diagram, dedicated API endpoints, a split-pane UI wireframe, and a full day (Day 3) in the build plan. The field schema type in Appendix C is the contract between the template engine and the pdf-lib renderer.

Want me to run the full 16-agent SaaS pipeline on this next, or start scaffolding Day 1?