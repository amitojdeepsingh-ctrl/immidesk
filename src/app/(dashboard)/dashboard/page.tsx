import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { StatsCard } from "@/components/ui/StatsCard";
import { Badge } from "@/components/ui/Badge";
import { Users, Briefcase, FileText, CalendarClock, ArrowRight, AlertTriangle, Send, FilePen, ShieldAlert } from "lucide-react";
import Link from "next/link";

const PIPELINE_STAGES = [
  { key: "INTAKE",                    label: "Intake",           color: "bg-zinc-400" },
  { key: "DOCUMENT_COLLECTION",       label: "Docs",             color: "bg-blue-400" },
  { key: "FORM_FILLING",              label: "Forms",            color: "bg-indigo-400" },
  { key: "READY_TO_SUBMIT",           label: "Ready",            color: "bg-amber-400" },
  { key: "SUBMITTED",                 label: "Submitted",        color: "bg-orange-400" },
  { key: "AOR_RECEIVED",              label: "AOR",              color: "bg-yellow-400" },
  { key: "IN_PROCESS",               label: "In Process",       color: "bg-purple-400" },
  { key: "ADDITIONAL_DOCS_REQUESTED", label: "More Docs",        color: "bg-red-400" },
  { key: "DECISION_MADE",             label: "Decision",         color: "bg-teal-400" },
];

export default async function DashboardPage() {
  const { prismaUser, organization } = await requireAuth();
  const supabase = getSupabaseAdmin();
  const orgId = organization.id;

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  const sixMonthsStr = sixMonthsFromNow.toISOString();

  const [
    { count: clientCount },
    { count: activeCaseCount },
    { data: orgCaseIds },
    { data: upcomingDeadlines },
    { data: recentActivities },
    { data: allActiveCases },
    { data: needsAttentionCases },
    { data: expiringClients },
  ] = await Promise.all([
    supabase.from("Client").select("*", { count: "exact", head: true }).eq("organizationId", orgId),
    supabase.from("Case").select("*", { count: "exact", head: true }).eq("organizationId", orgId).not("status", "in", '("CLOSED","APPROVED","REFUSED")'),
    // ponytail: agreement signed count reuses existing query below, no extra fetch needed
    supabase.from("Case").select("id").eq("organizationId", orgId),
    supabase.from("Case").select("id, title, deadlineDate, clientId, client:Client!inner(firstName, lastName)").eq("organizationId", orgId).not("deadlineDate", "is", null).order("deadlineDate", { ascending: true }).limit(5),
    supabase.from("ActivityLog").select("id, action, entityType, timestamp, user:User!inner(name)").eq("organizationId", orgId).order("timestamp", { ascending: false }).limit(8),
    // Pipeline counts
    supabase.from("Case").select("status").eq("organizationId", orgId).not("status", "in", '("CLOSED","APPROVED","REFUSED","DECISION_MADE")'),
    // Needs attention: INTAKE > 7 days old OR agreement not signed
    supabase.from("Case").select("id, title, status, createdAt, clientId, client:Client!inner(id, firstName, lastName)").eq("organizationId", orgId).eq("status", "INTAKE").lt("createdAt", sevenDaysAgo).order("createdAt", { ascending: true }).limit(10),
    // Expiring documents (passport or work permit within 6 months)
    supabase.from("Client").select("id, firstName, lastName, passportExpiry, workPermitExpiry")
      .eq("organizationId", orgId)
      .or(`passportExpiry.lte.${sixMonthsStr},workPermitExpiry.lte.${sixMonthsStr}`)
      .not("passportExpiry", "is", null)
      .limit(20),
  ]);

  const caseIdList = orgCaseIds?.map((c: { id: string }) => c.id) ?? [];
  const { count: pendingSubmissionCount } = caseIdList.length > 0
    ? await supabase.from("IMMFormSubmission").select("*", { count: "exact", head: true }).in("caseId", caseIdList).eq("status", "DRAFT")
    : { count: 0 };

  // Unsigned agreements — for "needs attention" + signed count stat
  const [{ data: unsignedAgreements }, { count: signedCount }] = await Promise.all([
    supabase.from("ServiceAgreement").select("clientId, client:Client!inner(id, firstName, lastName)")
      .eq("organizationId", orgId).eq("status", "DRAFT").limit(10),
    supabase.from("ServiceAgreement").select("*", { count: "exact", head: true })
      .eq("organizationId", orgId).eq("status", "SIGNED"),
  ]);

  // Pipeline counts by status
  const pipelineCounts: Record<string, number> = {};
  for (const c of allActiveCases ?? []) {
    pipelineCounts[c.status] = (pipelineCounts[c.status] ?? 0) + 1;
  }

  // Needs attention: stuck in INTAKE + unsigned agreements (deduplicated by clientId)
  const attentionItems: { clientId: string; clientName: string; reason: string; href: string }[] = [];
  const seen = new Set<string>();

  for (const c of needsAttentionCases ?? []) {
    const cl = Array.isArray(c.client) ? c.client[0] : c.client;
    if (!seen.has(cl.id)) {
      seen.add(cl.id);
      attentionItems.push({ clientId: cl.id, clientName: `${cl.firstName} ${cl.lastName}`, reason: "Stuck in Intake > 7 days", href: `/clients/${cl.id}` });
    }
  }
  for (const ag of unsignedAgreements ?? []) {
    const cl = Array.isArray(ag.client) ? ag.client[0] : ag.client;
    if (!seen.has(cl.id)) {
      seen.add(cl.id);
      attentionItems.push({ clientId: cl.id, clientName: `${cl.firstName} ${cl.lastName}`, reason: "Agreement not yet signed", href: `/clients/${cl.id}/agreement` });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Welcome back, {prismaUser.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Here&apos;s what&apos;s happening at {organization.name}
          </p>
        </div>
        <Link href="/newsletter" className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
          <Send className="h-3.5 w-3.5" /> Newsletter
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Clients" value={clientCount ?? 0} icon={Users} />
        <StatsCard title="Active Cases" value={activeCaseCount ?? 0} icon={Briefcase} />
        <StatsCard title="Agreements Signed" value={signedCount ?? 0} icon={FilePen} />
        <StatsCard title="Upcoming Deadlines" value={upcomingDeadlines?.length ?? 0} icon={CalendarClock} />
      </div>

      {/* Pipeline board */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Case Pipeline</h2>
        </div>
        <div className="flex overflow-x-auto px-5 py-4 gap-3">
          {PIPELINE_STAGES.map(({ key, label, color }) => {
            const count = pipelineCounts[key] ?? 0;
            return (
              <Link key={key} href={`/clients?status=${key}`} className="flex min-w-[90px] flex-col items-center rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3 text-center hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800">
                <div className={`mb-2 h-2 w-2 rounded-full ${color}`} />
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{count}</span>
                <span className="mt-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Needs attention */}
      {attentionItems.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 border-b border-amber-200 px-5 py-3 dark:border-amber-900/50">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-400">Needs Attention ({attentionItems.length})</h2>
          </div>
          <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
            {attentionItems.map(item => (
              <Link key={item.clientId} href={item.href} className="flex items-center justify-between px-5 py-3 hover:bg-amber-100/50 dark:hover:bg-amber-950/30">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{item.clientName}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">{item.reason}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Expiring documents */}
      {expiringClients && expiringClients.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
          <div className="flex items-center gap-2 border-b border-red-200 px-5 py-3 dark:border-red-900/50">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-900 dark:text-red-400">Documents Expiring Within 6 Months ({expiringClients.length})</h2>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900/30">
            {(expiringClients as Array<{id:string;firstName:string;lastName:string;passportExpiry:string|null;workPermitExpiry:string|null}>).map(c => {
              const alerts = [];
              if (c.passportExpiry) alerts.push({ type: "Passport", date: c.passportExpiry, days: Math.ceil((new Date(c.passportExpiry).getTime() - now) / 86400000) });
              if (c.workPermitExpiry) alerts.push({ type: "Work Permit", date: c.workPermitExpiry, days: Math.ceil((new Date(c.workPermitExpiry).getTime() - now) / 86400000) });
              return (
                <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-red-100/50 dark:hover:bg-red-950/30">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {alerts.map(a => `${a.type}: ${a.days > 0 ? `${a.days}d left` : "expired"}`).join(" · ")}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-red-400" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming deadlines */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Upcoming Deadlines</h2>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {!upcomingDeadlines || upcomingDeadlines.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-400">No upcoming deadlines</p>
            ) : (
              upcomingDeadlines.map((c: Record<string, unknown>) => {
                const client = c.client as Record<string, string> | undefined;
                return (
                  <Link key={c.id as string} href={`/clients/${c.clientId}`} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{c.title as string}</p>
                      <p className="text-xs text-zinc-500">{client?.firstName} {client?.lastName}</p>
                    </div>
                    <Badge variant={c.deadlineDate && new Date(c.deadlineDate as string) < new Date() ? "error" : "warning"}>
                      {c.deadlineDate ? new Date(c.deadlineDate as string).toLocaleDateString() : "—"}
                    </Badge>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent Activity</h2>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {!recentActivities || recentActivities.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-400">No recent activity</p>
            ) : (
              recentActivities.map((a: Record<string, unknown>) => {
                const user = a.user as Record<string, string> | undefined;
                const action = (a.action as string).replace(/_/g, " ").toLowerCase();
                return (
                  <div key={a.id as string} className="flex items-start gap-3 px-5 py-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {user?.name?.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-900 dark:text-zinc-50">
                        <span className="font-medium">{user?.name}</span> {action}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {new Date(a.timestamp as string).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
