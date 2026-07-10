import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { StatsCard } from "@/components/ui/StatsCard";
import { Badge } from "@/components/ui/Badge";
import { Users, RefreshCw, CheckCircle2, Archive } from "lucide-react";
import { SubmissionsList } from "./submissions-list";

const STATUS_BADGE: Record<string, "default" | "warning" | "error" | "success"> = {
  NEW: "warning", CONTACTED: "default", QUALIFIED: "success", CONVERTED: "success", ARCHIVED: "error",
};

export default async function SubmissionsPage() {
  const { organization } = await requireAuth();
  const supabase = getSupabaseAdmin();
  const orgId = organization.id;

  const [{ data: submissions }, { count: newCount }, { count: totalCount }] = await Promise.all([
    supabase.from("intake_submissions")
      .select("*")
      .eq("organization_id", orgId)
      .order("submitted_at", { ascending: false }),
    supabase.from("intake_submissions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "NEW"),
    supabase.from("intake_submissions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
  ]);

  const serialized = (submissions ?? []).map((s: any) => ({
    ...s,
    children_data: s.children_data ? JSON.parse(s.children_data) : [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Intake Submissions</h1>
        <p className="mt-1 text-sm text-zinc-500">Client applications submitted through the intake form.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="Total Submissions" value={totalCount ?? 0} icon={Users} />
        <StatsCard title="Pending Review" value={newCount ?? 0} icon={RefreshCw} />
        <StatsCard title="Converted" value={(totalCount ?? 0) - (newCount ?? 0) - (serialized.filter(s => s.status === "ARCHIVED").length)} icon={CheckCircle2} />
      </div>

      <SubmissionsList submissions={serialized} orgId={orgId} />
    </div>
  );
}
