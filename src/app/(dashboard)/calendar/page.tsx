import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Briefcase, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { CASE_TYPE_LABELS } from "@/lib/checklists";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtMonth(d: Date): string {
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "long" });
}
function fmtDay(s: string): string {
  return new Date(s).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const { organization } = await requireAuth();
  const params = await searchParams;
  const supabase = getSupabaseAdmin();

  // Resolve viewed month (first-of-month local anchor)
  const now = new Date();
  const base = params.month && /^\d{4}-\d{2}$/.test(params.month)
    ? new Date(Number(params.month.slice(0, 4)), Number(params.month.slice(5, 7)) - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStart = base;
  const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
  const prevMonth = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  const nextMonth = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // Cases with deadlines in this month
  const { data: cases } = await supabase
    .from("Case")
    .select("id, title, deadlineDate, status, caseType, clientId, client:Client!inner(id, firstName, lastName)")
    .eq("organizationId", organization.id)
    .not("deadlineDate", "is", null)
    .gte("deadlineDate", monthStart.toISOString())
    .lte("deadlineDate", monthEnd.toISOString());

  // Tasks due in this month
  const { data: tasks } = await supabase
    .from("Task")
    .select("id, title, dueDate, completedAt, caseId, case:Case!inner(id, title, organizationId)")
    .gte("dueDate", monthStart.toISOString())
    .lte("dueDate", monthEnd.toISOString());

  type Item = { kind: "case" | "task"; id: string; label: string; sub: string; date: Date; status?: string; href: string };
  const byDay = new Map<number, Item[]>();
  const push = (day: number, item: Item) => {
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(item);
  };

  for (const c of cases ?? []) {
    const client = Array.isArray(c.client) ? c.client[0] : c.client;
    const d = new Date(c.deadlineDate as string);
    push(d.getDate(), {
      kind: "case",
      id: c.id,
      label: c.title,
      sub: `${CASE_TYPE_LABELS[c.caseType]?.replace(/\(.*\)/, "").trim() ?? c.caseType} · ${client?.firstName} ${client?.lastName}`,
      date: d,
      status: c.status,
      href: `/cases/${c.id}`,
    });
  }
  for (const t of tasks ?? []) {
    if (t.completedAt) continue;
    const kase = Array.isArray(t.case) ? t.case[0] : t.case;
    push(new Date(t.dueDate as string).getDate(), {
      kind: "task",
      id: t.id,
      label: t.title,
      sub: `Task · ${kase?.title ?? ""}`,
      date: new Date(t.dueDate as string),
      href: `/cases/${kase?.id ?? ""}`,
    });
  }

  // Upcoming list: next 60 days across all months
  const upEnd = new Date(Date.now() + 60 * 86400_000).toISOString();
  const { data: upcomingCases } = await supabase
    .from("Case")
    .select("id, title, deadlineDate, status, clientId")
    .eq("organizationId", organization.id)
    .not("deadlineDate", "is", null)
    .not("status", "in", "(CLOSED,APPROVED,REFUSED)")
    .gte("deadlineDate", now.toISOString())
    .lte("deadlineDate", upEnd)
    .order("deadlineDate", { ascending: true })
    .limit(10);

  // Grid cells
  const firstDow = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells: Array<{ day: number | null }> = [
    ...Array.from({ length: firstDow }, () => ({ day: null })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1 })),
  ];
  while (cells.length % 7 !== 0) cells.push({ day: null });

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === base.getFullYear() && today.getMonth() === base.getMonth() && today.getDate() === day;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Calendar</h1>
          <p className="text-sm text-zinc-500">Case deadlines and task due dates</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${key(prevMonth)}`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[9rem] text-center text-sm font-semibold">{fmtMonth(base)}</span>
          <Link
            href={`/calendar?month=${key(nextMonth)}`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/calendar"
            className="ml-2 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Today
          </Link>
        </div>
      </div>

      {/* Month grid */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
          {DAY_LABELS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-zinc-500">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map(({ day }, i) => (
            <div
              key={i}
              className={cn(
                "min-h-[92px] space-y-1 border-b border-r border-zinc-100 p-1.5 last:border-r-0 dark:border-zinc-800",
                day === null && "bg-zinc-50/50 dark:bg-zinc-950/40",
              )}
            >
              {day !== null && (
                <>
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday(day)
                        ? "bg-brand-600 font-bold text-white"
                        : "text-zinc-400",
                    )}
                  >
                    {day}
                  </span>
                  {(byDay.get(day) ?? []).slice(0, 3).map((item) => (
                    <Link
                      key={`${item.kind}-${item.id}`}
                      href={item.href}
                      title={`${item.label} — ${item.sub}`}
                      className={cn(
                        "block truncate rounded px-1.5 py-0.5 text-[10px] font-medium",
                        item.kind === "case"
                          ? "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300",
                        item.date.getTime() < Date.now() && "line-through opacity-70",
                      )}
                    >
                      {item.kind === "case" ? "◆ " : "□ "}
                      {item.label}
                    </Link>
                  ))}
                  {(byDay.get(day)?.length ?? 0) > 3 && (
                    <p className="px-1 text-[10px] text-zinc-400">
                      +{(byDay.get(day)!.length - 3)} more
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend + upcoming */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <Briefcase className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Upcoming deadlines (next 60 days)
          </h2>
          {(upcomingCases ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400">No upcoming deadlines</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(upcomingCases ?? []).map((c) => {
                const overdue = new Date(c.deadlineDate as string).getTime() < Date.now();
                return (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/cases/${c.id}`} className="truncate font-medium text-zinc-800 hover:underline dark:text-zinc-200">
                      {c.title}
                    </Link>
                    <span className={cn("shrink-0 text-xs", overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-zinc-400")}>
                      {fmtDay(c.deadlineDate as string)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <CheckSquare className="h-4 w-4 text-amber-500" /> Legend
          </h2>
          <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <p><span className="mr-2 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">◆ Case</span> Case deadline</p>
            <p><span className="mr-2 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">□ Task</span> Task due date (open only)</p>
            <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-zinc-400" /> Click any entry to open its case.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
