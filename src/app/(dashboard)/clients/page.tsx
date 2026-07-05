import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { Search, UserPlus, Users, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { ClientCard } from "@/components/clients/ClientCard";
import { cn } from "@/lib/utils";
import { CASE_TYPE_LABELS } from "@/lib/checklists";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    caseType?: string;
    view?: string; // "clients" | "leads"
  }>;
}

const PER_PAGE = 20;

export default async function ClientsPage({ searchParams }: PageProps) {
  const { organization } = await requireAuth();
  const params = await searchParams;

  const page           = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search         = params.search?.trim() ?? "";
  const statusFilter   = params.status ?? "";
  const caseTypeFilter = params.caseType ?? "";
  const view           = params.view === "leads" ? "leads" : "clients";
  const skip           = (page - 1) * PER_PAGE;

  const supabase = getSupabaseAdmin();
  const orgId    = organization.id;

  let query = supabase
    .from("Client")
    .select(`
      id, firstName, lastName, email, phone, nationality, city, province, tags, createdAt,
      cases:Case(id, caseType, status, title, createdAt),
      agreements:ServiceAgreement(id, status, feeAmount, feeCurrency, signedAt),
      documents:Document(id)
    `, { count: "exact" })
    .eq("organizationId", orgId)
    .order("createdAt", { ascending: false })
    .range(skip, skip + PER_PAGE - 1);

  if (search) {
    query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: rawClients, count: totalCount, error } = await query;

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-red-500">Failed to load clients: {error.message}</p>
      </div>
    );
  }

  // Split leads vs clients by "lead" tag
  const allRecords = rawClients ?? [];
  const isLead = (c: { tags: string[] }) => (c.tags ?? []).includes("lead");

  const filtered = allRecords.filter(c => {
    if (view === "leads" && !isLead(c)) return false;
    if (view === "clients" && isLead(c)) return false;
    const latestCase = (c.cases as {caseType:string;status:string}[])?.[0];
    if (statusFilter && latestCase?.status !== statusFilter) return false;
    if (caseTypeFilter && latestCase?.caseType !== caseTypeFilter) return false;
    return true;
  });

  const leadCount   = allRecords.filter(c => isLead(c)).length;
  const clientCount = allRecords.filter(c => !isLead(c)).length;
  const totalPages  = Math.ceil((totalCount ?? 0) / PER_PAGE);

  function buildQuery(overrides: Record<string, string | undefined>) {
    const q = new URLSearchParams();
    const merged = {
      page: page.toString(),
      view,
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
      ...(caseTypeFilter && { caseType: caseTypeFilter }),
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) q.set(k, v); });
    return q.toString();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {view === "leads" ? "Leads" : "Clients"}
          </h1>
          <p className="text-sm text-zinc-500">
            {view === "leads"
              ? `${leadCount} lead${leadCount !== 1 ? "s" : ""} — prospects not yet onboarded`
              : `${clientCount} paid client${clientCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/clients/new?lead=true`}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            <Target className="h-4 w-4" /> Add Lead
          </Link>
          <Link href="/clients/new"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
            <UserPlus className="h-4 w-4" /> New Client
          </Link>
        </div>
      </div>

      {/* View tabs: Clients / Leads */}
      <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800">
        <Link href={`/clients?${buildQuery({ view: "clients", page: "1" })}`}
          className={cn("flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            view === "clients"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400")}>
          <Users className="h-3.5 w-3.5" />
          Clients
          <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            view === "clients" ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400")}>
            {clientCount}
          </span>
        </Link>
        <Link href={`/clients?${buildQuery({ view: "leads", page: "1" })}`}
          className={cn("flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            view === "leads"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400")}>
          <Target className="h-3.5 w-3.5" />
          Leads
          {leadCount > 0 && (
            <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
              view === "leads" ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
              {leadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <form className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input name="search" type="search" defaultValue={search} placeholder="Search name or email…"
            className="h-8 w-56 rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
        </form>

        <Link href={`/clients?${buildQuery({ caseType: "", page: "1" })}`}
          className={cn("h-8 rounded-md border px-3 text-xs font-medium leading-8", !caseTypeFilter ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400")}>
          All Types
        </Link>
        {Object.entries(CASE_TYPE_LABELS).map(([key, label]) => (
          <Link key={key} href={`/clients?${buildQuery({ caseType: key, page: "1" })}`}
            className={cn("h-8 rounded-md border px-3 text-xs font-medium leading-8 whitespace-nowrap", caseTypeFilter === key ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400")}>
            {label.split(" ")[0] === "LMIA" ? label : label.split("(")[0].trim()}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          {view === "leads" ? <Target className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" /> : <Users className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />}
          <p className="text-sm font-medium text-zinc-500">
            {search ? `No ${view} match your search` : `No ${view} yet`}
          </p>
          {!search && (
            <Link
              href={view === "leads" ? "/clients/new?lead=true" : "/clients/new"}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
              {view === "leads" ? <><Target className="h-4 w-4" /> Add Lead</> : <><UserPlus className="h-4 w-4" /> New Client</>}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((client) => {
            const latestCase = (client.cases as {id:string;caseType:string;status:string;title:string}[])?.[0];
            const latestAgreement = (client.agreements as {id:string;status:string;signedAt:string|null;feeAmount:number;feeCurrency:string}[])?.[0];
            const docCount = (client.documents as {id:string}[])?.length ?? 0;
            return (
              <ClientCard
                key={client.id}
                client={client as Parameters<typeof ClientCard>[0]["client"]}
                latestCase={latestCase}
                latestAgreement={latestAgreement}
                docCount={docCount}
              />
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <Link href={page > 1 ? `/clients?${buildQuery({ page: (page - 1).toString() })}` : "#"}
              className={cn("rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100", page <= 1 && "pointer-events-none opacity-30")}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 4), page + 3).map(n => (
              <Link key={n} href={`/clients?${buildQuery({ page: n.toString() })}`}
                className={cn("rounded-md px-2.5 py-1 text-xs font-medium", n === page ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}>
                {n}
              </Link>
            ))}
            <Link href={page < totalPages ? `/clients?${buildQuery({ page: (page + 1).toString() })}` : "#"}
              className={cn("rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100", page >= totalPages && "pointer-events-none opacity-30")}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
