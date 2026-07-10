import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { CreditCard, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const METHOD_LABELS: Record<string, string> = {
  INTERAC: "Interac",
  WIRE: "Wire Transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  CREDIT_CARD: "Credit Card",
  PAYPAL: "PayPal",
  STRIPE: "Stripe",
  OTHER: "Other",
};

const fmtMoney = (n: number, cur = "CAD") =>
  `${cur} $${Number(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

export default async function PaymentsPage() {
  const { organization } = await requireAuth();
  const supabase = getSupabaseAdmin();

  const { data: payments } = await supabase
    .from("Payment")
    .select("id, amount, currency, paymentMethod, paymentDate, receiptNumber, notes, clientId, client:Client!inner(id, firstName, lastName)")
    .eq("organizationId", organization.id)
    .order("paymentDate", { ascending: false });

  const totalReceived = payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const paymentCount = payments?.length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Payments</h1>
        <p className="text-sm text-zinc-500">Track client payments received</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">Total Received</p>
          <p className="mt-1 text-lg font-semibold text-green-600">{fmtMoney(totalReceived)}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">Payments Recorded</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{paymentCount}</p>
        </div>
      </div>

      {!payments || payments.length === 0 ? (
        <div className="py-16 text-center">
          <CreditCard className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-500">No payments recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {["Date", "Client", "Amount", "Method", "Receipt", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.map(p => {
                const client = Array.isArray(p.client) ? p.client[0] : p.client;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3 text-zinc-500">{fmtDate(p.paymentDate as string)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${p.clientId}`} className="font-medium text-zinc-800 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400">
                        {client?.firstName} {client?.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">{fmtMoney(Number(p.amount), p.currency)}</td>
                    <td className="px-4 py-3 text-zinc-500">{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</td>
                    <td className="px-4 py-3 text-zinc-500">{p.receiptNumber ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${p.clientId}`}
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
