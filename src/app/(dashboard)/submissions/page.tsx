import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Clock } from "lucide-react";

const CASE_TYPE_LABELS: Record<string, string> = {
  EXPRESS_ENTRY: "Express Entry",
  PNP: "Provincial Nominee Program",
  STUDY_PERMIT: "Study Permit",
  WORK_PERMIT: "Work Permit",
  VISITOR_VISA: "Visitor Visa",
  FAMILY_SPONSORSHIP: "Family Sponsorship",
  SPOUSAL_SPONSORSHIP: "Spousal Sponsorship",
  CITIZENSHIP: "Citizenship",
  OTHER: "Other",
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function SubmissionsPage() {
  const { organization } = await requireAuth();
  const supabase = getSupabaseAdmin();

  const { data: submittedCases } = await supabase
    .from("Case")
    .select("id, title, caseType, submissionDate, createdAt, client:Client(id, firstName, lastName)")
    .eq("organizationId", organization.id)
    .eq("status", "SUBMITTED")
    .order("submissionDate", { ascending: false, nullsFirst: false });

  const count = submittedCases?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Submissions</h1>
        <p className="mt-1 text-sm text-zinc-500">{count} case{count !== 1 ? "s" : ""} marked as submitted</p>
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900">
          <Clock className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No submitted cases yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Client</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Case</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Program</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
              {submittedCases?.map((c: any) => (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                    {c.client ? `${c.client.firstName} ${c.client.lastName}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{c.title}</td>
                  <td className="px-4 py-3 text-zinc-500">{CASE_TYPE_LABELS[c.caseType] ?? c.caseType}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      {fmtDate(c.submissionDate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
