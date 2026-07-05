"use client";

import Link from "next/link";
import { Mail, Phone, Calendar, ChevronRight, FileText, FilePen, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { CASE_TYPE_LABELS } from "@/lib/checklists";

const CASE_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  INTAKE:                    { label: "Intake",          color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  DOCUMENT_COLLECTION:       { label: "Collecting Docs", color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  FORM_FILLING:              { label: "Forms",           color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400" },
  READY_TO_SUBMIT:           { label: "Ready",           color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  SUBMITTED:                 { label: "Submitted",       color: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400" },
  AOR_RECEIVED:              { label: "AOR Received",    color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" },
  IN_PROCESS:                { label: "In Process",      color: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400" },
  ADDITIONAL_DOCS_REQUESTED: { label: "More Docs Needed",color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" },
  DECISION_MADE:             { label: "Decision Made",   color: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400" },
  APPROVED:                  { label: "Approved ✓",      color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" },
  REFUSED:                   { label: "Refused",         color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" },
  CLOSED:                    { label: "Closed",          color: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500" },
};

interface ClientCardProps {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    nationality?: string | null;
    city?: string | null;
    province?: string | null;
    tags?: string[];
    createdAt: string | Date;
  };
  latestCase?: { id: string; caseType: string; status: string; title: string } | null;
  latestAgreement?: { id: string; status: string; signedAt: string | null; feeAmount: number; feeCurrency: string } | null;
  docCount?: number;
  className?: string;
}

export function ClientCard({ client, latestCase, latestAgreement, docCount = 0, className }: ClientCardProps) {
  const fullName  = `${client.firstName} ${client.lastName}`;
  const initials  = getInitials(fullName);
  const caseLabel = latestCase ? (CASE_TYPE_LABELS[latestCase.caseType] ?? latestCase.caseType) : null;
  const statusMeta = latestCase ? (CASE_STATUS_LABEL[latestCase.status] ?? { label: latestCase.status, color: "bg-zinc-100 text-zinc-500" }) : null;
  const agreementSigned = latestAgreement?.status === "SIGNED";
  const agreementPending = latestAgreement && !agreementSigned;

  // Shorten long application type labels for the badge
  const shortLabel = caseLabel
    ?.replace("(Federal Skilled Worker / CEC / FST)", "")
    ?.replace("(Temporary Resident Visa)", "")
    ?.replace("(Parent / Grandparent)", "")
    ?.trim();

  return (
    <Link
      href={`/clients/${client.id}`}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50/50",
        "dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50",
        agreementPending && "border-l-2 border-l-amber-400",
        className,
      )}
    >
      {/* Top row: avatar + name + arrow */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{fullName}</p>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>
            {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>}
          </div>
        </div>
      </div>

      {/* Application type + case status */}
      {latestCase && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
            {shortLabel}
          </span>
          {statusMeta && (
            <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", statusMeta.color)}>
              {statusMeta.label}
            </span>
          )}
        </div>
      )}

      {/* Status indicators row */}
      <div className="flex items-center gap-4 border-t border-zinc-100 pt-2 dark:border-zinc-800">

        {/* Agreement */}
        <div className={cn("flex items-center gap-1 text-xs font-medium", agreementSigned ? "text-green-600 dark:text-green-400" : agreementPending ? "text-amber-500" : "text-zinc-400")}>
          {agreementSigned
            ? <><CheckCircle2 className="h-3.5 w-3.5" /> Signed</>
            : agreementPending
              ? <><AlertCircle className="h-3.5 w-3.5" /> Unsigned</>
              : <><FilePen className="h-3.5 w-3.5" /> No Agreement</>}
        </div>

        {/* Docs */}
        <div className={cn("flex items-center gap-1 text-xs font-medium", docCount > 0 ? "text-blue-600 dark:text-blue-400" : "text-zinc-400")}>
          <FileText className="h-3.5 w-3.5" />
          {docCount} doc{docCount !== 1 ? "s" : ""}
        </div>

        {/* Date added */}
        <div className="ml-auto flex items-center gap-1 text-[10px] text-zinc-400">
          <Clock className="h-3 w-3" />
          {formatDate(client.createdAt, "MMM d, yyyy")}
        </div>
      </div>

      {/* Tags */}
      {client.tags && client.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {client.tags.slice(0, 3).map(tag => (
            <span key={tag} className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
