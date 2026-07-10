import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { Briefcase, Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CASE_TYPE_LABELS } from "@/lib/checklists";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    caseType?: string;
    search?: string;
  }>;
}

const CASE_STATUS_STYLES: Record<string, string> = {
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

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  NORMAL: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  HIGH: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  URGENT: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "INTAKE", label: "Intake" },
  { key: "DOCUMENT_COLLECTION", label: "Docs" },
  { key: "FORM_FILLING", label: "Forms" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "APPROVED", label: "Approved" },
  { key: "REFUSED", label: "Refused" },
  { key: "CLOSED", label: "Closed" },
];

const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

export default async function CasesPage({ searchParams }: PageProps) {
  const { organization } = await requireAuth();
  const params = await searchParams;

  const statusFilter = params.status ?? "";
  const caseTypeFilter = params.caseType ?? "";
  const search = params.search?.trim() ?? "";

  const supabase = getSupabaseAdmin();
  const orgId = organization.id;

  let query = supabase
    .from("Case")
    .select("id, title, caseType, status, priority, deadlineDate, createdAt, clientId, client:Client!inner(id, firstName, lastName, email)")
    .eq("organizationId", orgId)
    .order("createdAt", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (caseTypeFilter) {
    query = query.eq("caseType", caseTypeFilter);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,client.firstName.ilike.%${search}%,client.lastName.ilike.%${search}%`);
  }

  const { data: cases } = await query;

  const list = cases ?? [];

  const totalCount = list.length;
  const activeCount = list.filter(c => !["CLOSED", "APPROVED", "REFUSED"].includes(c.status)).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Cases</h1>
        <p className="text-sm text-zinc-500">{totalCount} total, {activeCount} active</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {STATUS_FILTERS.map(({ key, label }) => {
            const href = key
              ? `/cases?status=${key}${caseTypeFilter ? `&caseType=${caseTypeFilter}` : ""}${search ? `&search=${search}` : ""}`
              : `/cases${caseTypeFilter ? `?caseType=${caseTypeFilter}` : ""}${search ? `&search=${search}` : ""}`;
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  "rounded-md border px-3 py-1 text-xs font-medium",
                  statusFilter === key
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <form className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input name="search" type="search" defaultValue={search} placeholder="Search title or client…"
              className="h-8 w-56 rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </form>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          <Briefcase className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500">
            {search ? "No cases match your search" : "No cases yet"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Create a case from a client profile page</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {["Title", "Client", "Type", "Status", "Priority", "Deadline", "Created", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {list.map(c => {
                const client = Array.isArray(c.client) ? c.client[0] : c.client;
                const typeLabel = CASE_TYPE_LABELS[c.caseType]?.replace(/\(.*\)/, "").trim() ?? c.caseType;
                return (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 max-w-[200px] truncate">{c.title}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.clientId}`} className="font-medium text-zinc-800 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400">
                        {client?.firstName} {client?.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 max-w-[140px] truncate">{typeLabel}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", CASE_STATUS_STYLES[c.status] ?? CASE_STATUS_STYLES.INTAKE)}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", PRIORITY_STYLES[c.priority] ?? PRIORITY_STYLES.NORMAL)}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {c.deadlineDate ? fmtDate(typeof c.deadlineDate === "string" ? c.deadlineDate : new Date(c.deadlineDate as Date).toISOString()) : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(typeof c.createdAt === "string" ? c.createdAt : new Date(c.createdAt as Date).toISOString())}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.clientId}`}
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
