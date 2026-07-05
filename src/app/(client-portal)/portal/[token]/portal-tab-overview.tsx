"use client";

import { CheckCircle2, FileText, ClipboardList, PenLine, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExistingDoc } from "./portal-view";

const STATUS_STAGES = [
  { key: "INTAKE",                    label: "Getting Started" },
  { key: "DOCUMENT_COLLECTION",       label: "Gathering Documents" },
  { key: "FORM_FILLING",              label: "Preparing Forms" },
  { key: "READY_TO_SUBMIT",           label: "Ready to Submit" },
  { key: "SUBMITTED",                 label: "Submitted to IRCC" },
  { key: "AOR_RECEIVED",              label: "Acknowledged" },
  { key: "IN_PROCESS",                label: "In Process" },
  { key: "ADDITIONAL_DOCS_REQUESTED", label: "More Docs Needed" },
  { key: "DECISION_MADE",             label: "Decision Made" },
  { key: "APPROVED",                  label: "Approved ✓" },
];

interface PortalTabOverviewProps {
  caseStatus: string;
  caseLabel: string;
  checklist: string[];
  docsUploaded: number;
  existingDocs: ExistingDoc[];
  agreementStatus: string | null;
  agreementSignedAt: string | null;
  clientEmail: string;
}

export function PortalTabOverview({
  caseStatus,
  caseLabel,
  checklist,
  docsUploaded,
  existingDocs,
  agreementStatus,
  agreementSignedAt,
  clientEmail,
}: PortalTabOverviewProps) {
  const idx = STATUS_STAGES.findIndex(s => s.key === caseStatus);
  const currentIdx = idx >= 0 ? idx : 0;
  const current = STATUS_STAGES[currentIdx];
  const pct = Math.round(((currentIdx + 1) / STATUS_STAGES.length) * 100);
  const checklistPct = checklist.length > 0
    ? Math.min(100, Math.round((docsUploaded / checklist.length) * 100))
    : 0;

  return (
    <div className="space-y-6">

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Documents</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{docsUploaded}</p>
          <p className="text-xs text-zinc-400">uploaded</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <ClipboardList className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Checklist</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{checklistPct}%</p>
          <p className="text-xs text-zinc-400">complete</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <PenLine className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Agreement</span>
          </div>
          <div className="mt-2">
            {agreementStatus === "SIGNED" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle2 className="h-3 w-3" /> Signed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Pending
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {agreementStatus === "SIGNED" && agreementSignedAt
              ? new Date(agreementSignedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
              : "not yet signed"}
          </p>
        </div>
      </div>

      {/* Application status progress */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Application Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Current Stage: <span className="text-zinc-900 dark:text-zinc-50">{current.label}</span>
            </span>
            <span className="text-zinc-400">{pct}% complete</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-2 rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{STATUS_STAGES[0].label}</span>
            <span>{STATUS_STAGES[STATUS_STAGES.length - 1].label}</span>
          </div>
        </div>
      </div>

      {/* Case Timeline */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Case Timeline</h2>
        <ol className="relative space-y-0">
          {STATUS_STAGES.map((stage, i) => {
            const isPast = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isFuture = i > currentIdx;

            return (
              <li key={stage.key} className="flex gap-4">
                {/* Left: dot + connector line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isPast
                      ? "border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50"
                      : isCurrent
                        ? "border-zinc-900 bg-white dark:border-zinc-50 dark:bg-zinc-900"
                        : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                  )}>
                    {isPast ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-white dark:text-zinc-900" />
                    ) : isCurrent ? (
                      <Circle className="h-2.5 w-2.5 fill-zinc-900 text-zinc-900 dark:fill-zinc-50 dark:text-zinc-50" />
                    ) : (
                      <Circle className="h-2.5 w-2.5 text-zinc-300 dark:text-zinc-600" />
                    )}
                  </div>
                  {i < STATUS_STAGES.length - 1 && (
                    <div className={cn(
                      "my-1 w-0.5 flex-1",
                      isPast ? "bg-zinc-900 dark:bg-zinc-50" : "bg-zinc-200 dark:bg-zinc-700"
                    )} style={{ minHeight: "1.5rem" }} />
                  )}
                </div>

                {/* Right: label */}
                <div className={cn(
                  "pb-4 pt-1 text-sm",
                  isPast ? "text-zinc-500 dark:text-zinc-400"
                  : isCurrent ? "font-semibold text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-300 dark:text-zinc-600"
                )}>
                  {stage.label}
                  {isCurrent && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      Current
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Signed agreement note */}
      {agreementStatus === "SIGNED" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-950/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Signed Agreement on File</p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                Your signed service agreement is on file with your consultant. To request a copy, please{" "}
                <a
                  href={`mailto:${clientEmail}?subject=Request for Signed Agreement Copy`}
                  className="underline hover:no-underline"
                >
                  contact us by email
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
