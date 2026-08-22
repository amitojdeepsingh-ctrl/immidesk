export const CASE_STATUS_STYLES: Record<string, string> = {
  INTAKE: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  DOCUMENT_COLLECTION: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  FORM_FILLING: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
  READY_TO_SUBMIT: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  SUBMITTED: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  AOR_RECEIVED: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  IN_PROCESS: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  ADDITIONAL_DOCS_REQUESTED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  DECISION_MADE: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  REFUSED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  CLOSED: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
};

export const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  NORMAL: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  HIGH: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  URGENT: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
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
