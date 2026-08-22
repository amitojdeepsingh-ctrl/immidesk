import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { Briefcase, Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CASE_TYPE_LABELS } from "@/lib/checklists";
import { MarkSubmittedButton } from "./case-actions";
import { CASE_STATUS_STYLES, PRIORITY_STYLES } from "./case-styles";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    caseType?: string;
    search?: string;
  }>;
}

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
                    ? "border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
              className="h-8 w-56 rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
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
                {["Title", "Client", "Type", "Status", "Priority", "Deadline", "Created", "Action"].map(h => (
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
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 max-w-[200px] truncate">
                      <Link href={`/cases/${c.id}`} className="hover:underline">{c.title}</Link>
                    </td>
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
                      {c.status === "SUBMITTED" || c.status === "APPROVED" || c.status === "REFUSED" || c.status === "CLOSED" ? (
                        <Link href={`/cases/${c.id}`}
                          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <MarkSubmittedButton caseId={c.id} />
                      )}
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
