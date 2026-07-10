import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { FilePen, CheckCircle2, Clock, Send, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SIGNED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

export default async function AgreementsPage() {
  const { organization } = await requireAuth();
  const supabase = getSupabaseAdmin();

  const { data: agreements } = await supabase
    .from("ServiceAgreement")
    .select("id, title, status, serviceType, feeAmount, feeCurrency, createdAt, signedAt, clientId, client:Client!inner(id, firstName, lastName)")
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: false });

  const total = agreements?.length ?? 0;
  const signed = agreements?.filter(a => a.status === "SIGNED").length ?? 0;
  const pending = agreements?.filter(a => a.status !== "SIGNED").length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Service Agreements</h1>
        <p className="text-sm text-zinc-500">Manage client retainer agreements</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Agreements", value: total, color: "text-zinc-900 dark:text-zinc-50" },
          { label: "Signed", value: signed, color: "text-green-600" },
          { label: "Pending", value: pending, color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={cn("mt-1 text-lg font-semibold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {!agreements || agreements.length === 0 ? (
        <div className="py-16 text-center">
          <FilePen className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-500">No agreements yet. Create one from a client profile.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {["Title", "Client", "Service Type", "Fee", "Date", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {agreements.map(ag => {
                const client = Array.isArray(ag.client) ? ag.client[0] : ag.client;
                return (
                  <tr key={ag.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{ag.title}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${ag.clientId}`} className="font-medium text-zinc-800 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400">
                        {client?.firstName} {client?.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{ag.serviceType}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                      {ag.feeCurrency} ${Number(ag.feeAmount).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{ag.signedAt ? fmtDate(ag.signedAt as string) : fmtDate(ag.createdAt as string)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[ag.status] ?? STATUS_COLORS["DRAFT"])}>
                        {ag.status === "SIGNED" ? "Signed" : ag.status === "SENT" ? "Sent" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${ag.clientId}/agreement`}
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
