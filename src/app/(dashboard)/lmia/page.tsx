import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { ClipboardList, CheckCircle2, Clock, AlertCircle, Mail } from "lucide-react";
import { NewLmiaCaseButton } from "./new-lmia-case-button";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  IN_PROGRESS: { label: "In Progress", icon: Clock, className: "text-amber-600 bg-amber-50 border-amber-200" },
  APPROVED:    { label: "Approved",    icon: CheckCircle2, className: "text-green-600 bg-green-50 border-green-200" },
  REFUSED:     { label: "Refused",     icon: AlertCircle, className: "text-red-600 bg-red-50 border-red-200" },
  WITHDRAWN:   { label: "Withdrawn",   icon: AlertCircle, className: "text-zinc-500 bg-zinc-50 border-zinc-200" },
};

export default async function LmiaListPage() {
  const { organization } = await requireAuth();
  const db = getSupabaseAdmin();

  const { data: cases } = await db
    .from("LmiaCase")
    .select("*")
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: false });

  const list = cases ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">LMIA</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Labour Market Impact Assessment</p>
        </div>
        <NewLmiaCaseButton />
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/lmia" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50">
          <ClipboardList className="h-4 w-4" /> Cases
        </Link>
        <Link href="/lmia/leads" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          <Mail className="h-4 w-4" /> Outreach
        </Link>
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 flex flex-col items-center justify-center py-20 gap-3">
          <ClipboardList className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500">No LMIA cases yet</p>
          <p className="text-xs text-zinc-400">Create a case for each employer LMIA application</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((c: Record<string, string>) => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.IN_PROGRESS;
            const Icon = cfg.icon;
            return (
              <Link
                key={c.id}
                href={`/lmia/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-zinc-300 hover:shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50 truncate">{c.employerName}</p>
                  <p className="text-sm text-zinc-500 truncate mt-0.5">
                    {c.jobTitle}{c.nocCode ? ` · NOC ${c.nocCode}` : ""}{c.location ? ` · ${c.location}` : ""}
                  </p>
                </div>
                <span className={`ml-4 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.className}`}>
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
