// ─────────────────────────────────────────────────────────────────────────────
// Case status & priority pills — cohesive tinted system.
//
// Recipe (both modes): soft tint fill + matching ink + inset ring.
// Light:  bg-{c}-50  text-{c}-700  ring-{c}-200
// Dark:   bg-{c}-500/10  text-{c}-400  ring-{c}-500/25
//
// Progression semantics: cool blues = preparation · warm ambers = lodged with
// government · brand navy = active processing · emerald/red = outcome.
// Red is reserved for refusal/urgency only — never routine attention states.
//
// NOTE: classes are written as full literal strings (no interpolation) so the
// Tailwind JIT compiler can statically detect them.
// ─────────────────────────────────────────────────────────────────────────────

export const CASE_STATUS_STYLES: Record<string, string> = {
  INTAKE:
    "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-zinc-500/25",
  DOCUMENT_COLLECTION:
    "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/25",
  FORM_FILLING:
    "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/25",
  READY_TO_SUBMIT:
    "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/25",
  SUBMITTED:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/25",
  AOR_RECEIVED:
    "bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:ring-cyan-500/25",
  IN_PROCESS:
    "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/25",
  ADDITIONAL_DOCS_REQUESTED:
    "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/25",
  DECISION_MADE:
    "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/25",
  APPROVED:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/25",
  REFUSED:
    "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/25",
  CLOSED:
    "bg-zinc-100 text-zinc-400 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-500 dark:ring-zinc-500/20",
};

export const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-zinc-500/25",
  NORMAL:
    "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/25",
  HIGH: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/25",
  URGENT: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/25",
};

export const CASE_STATUSES = [
  "INTAKE",
  "DOCUMENT_COLLECTION",
  "FORM_FILLING",
  "READY_TO_SUBMIT",
  "SUBMITTED",
  "AOR_RECEIVED",
  "IN_PROCESS",
  "ADDITIONAL_DOCS_REQUESTED",
  "DECISION_MADE",
  "APPROVED",
  "REFUSED",
  "CLOSED",
] as const;
