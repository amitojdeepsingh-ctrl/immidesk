import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { ClipboardList, Mail } from "lucide-react";
import { LeadsManager } from "./leads-manager";

export default async function LmiaLeadsPage() {
  const { organization } = await requireAuth();
  const db = getSupabaseAdmin();

  const { data: leads } = await db
    .from("LmiaLead")
    .select("*")
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: false });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">LMIA</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Labour Market Impact Assessment</p>
      </div>
      <div className="flex gap-1 mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/lmia" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          <ClipboardList className="h-4 w-4" /> Cases
        </Link>
        <Link href="/lmia/leads" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50">
          <Mail className="h-4 w-4" /> Outreach
        </Link>
      </div>
      <LeadsManager initialLeads={leads ?? []} />
    </div>
  );
}
