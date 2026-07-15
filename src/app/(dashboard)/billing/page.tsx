"use client";

import { useState, useEffect } from "react";
import { CreditCard, ExternalLink, Check, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface Subscription {
  planTier: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  receiptNumber: string | null;
  client: { firstName: string; lastName: string; email: string } | null;
  agreement: { id: string; title: string } | null;
}

const PLAN_TIERS = [
  { id: "SOLO", name: "Solo", price: "$49/mo", users: "1 user", cases: "50 cases", storage: "5GB storage", reports: "Basic reports", ai: false, highlighted: "" },
  { id: "TEAM", name: "Team", price: "$99/mo", users: "5 users", cases: "Unlimited cases", storage: "25GB storage", reports: "Advanced reports", ai: false, highlighted: "Most Popular" },
  { id: "FIRM", name: "Firm", price: "$199/mo", users: "15 users", cases: "Unlimited cases", storage: "100GB storage", reports: "Advanced reports", ai: true, highlighted: "" },
  { id: "ENTERPRISE", name: "Enterprise", price: "Custom", users: "Unlimited users", cases: "Unlimited cases", storage: "Custom storage", reports: "Everything", ai: true, highlighted: "" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELED: "error",
  UNPAID: "error",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD: "Credit Card",
  BANK_TRANSFER: "Bank Transfer",
  CHECK: "Check",
  CASH: "Cash",
  OTHER: "Other",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);
  const [manageMsg, setManageMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/billing").then(r => r.json()),
      fetch("/api/billing/invoices").then(r => r.json()),
    ]).then(([subRes, invRes]) => {
      setSubscription(subRes?.data?.subscription ?? null);
      setPayments(Array.isArray(invRes?.data) ? invRes.data : []);
    }).finally(() => setLoading(false));
  }, []);

  async function handleManage() {
    setManaging(true);
    setManageMsg(null);
    try {
      const res = await fetch("/api/billing/manage", { method: "POST" });
      const json = await res.json();
      if (json?.data?.url) {
        window.open(json.data.url, "_blank");
      } else {
        setManageMsg(json?.data?.message ?? "Billing portal is not available.");
      }
    } catch {
      setManageMsg("Failed to open billing portal.");
    } finally {
      setManaging(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  const planName = subscription?.planTier ?? "SOLO";
  const statusValue = subscription?.status ?? "TRIALING";
  const currentPlan = PLAN_TIERS.find(p => p.id === planName) ?? PLAN_TIERS[0];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Billing</h1>
          <p className="text-sm text-zinc-500">Manage your subscription and payment methods</p>
        </div>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{currentPlan.name} Plan</h2>
              <Badge variant={STATUS_VARIANT[statusValue] ?? "default"}>{statusValue}</Badge>
            </div>
            <p className="text-sm text-zinc-500">{currentPlan.price} — {currentPlan.users}, {currentPlan.cases}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
              {subscription?.currentPeriodEnd && (
                <span>Renewal: {formatDate(subscription.currentPeriodEnd)}</span>
              )}
              {subscription?.trialEndsAt && (
                <span>Trial ends: {formatDate(subscription.trialEndsAt)}</span>
              )}
              {subscription?.cancelAtPeriodEnd && (
                <Badge variant="warning">Cancels at period end</Badge>
              )}
            </div>
          </div>
          <button onClick={handleManage} disabled={managing}
            className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 disabled:opacity-50">
            {managing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
            Manage Subscription
          </button>
        </div>
        {manageMsg && <p className="mt-3 text-xs text-zinc-500">{manageMsg}</p>}
      </div>

      {/* Plan Comparison */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Compare Plans</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_TIERS.map(plan => {
            const isCurrent = plan.id === planName;
            return (
              <div key={plan.id} className={cn(
                "relative rounded-lg border p-4 transition-colors",
                isCurrent
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-800"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
              )}>
                {plan.highlighted && (
                  <span className="absolute -top-2.5 left-3 rounded-full bg-zinc-900 px-2.5 py-0.5 text-[10px] font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
                    {plan.highlighted}
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Current
                  </span>
                )}
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{plan.name}</h4>
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{plan.price}</p>
                </div>
                <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> {plan.users}</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> {plan.cases}</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> {plan.storage}</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> {plan.reports}</li>
                  {plan.ai && <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> AI features included</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Payment Method */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Payment Methods</h3>
            <p className="text-xs text-zinc-500 mt-0.5">No payment method on file.</p>
          </div>
          <button onClick={handleManage} disabled={managing}
            className="flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
            <CreditCard className="h-3.5 w-3.5" /> Add Payment Method
          </button>
        </div>
      </div>

      {/* Billing History */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Billing History</h3>
        {payments.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
            No billing history yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {payments.map(p => (
                  <tr key={p.id} className="bg-white dark:bg-zinc-900">
                    <td className="px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-50">{formatAmount(p.amount, p.currency)}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</td>
                    <td className="px-4 py-2.5"><Badge variant="success">Paid</Badge></td>
                    <td className="px-4 py-2.5">
                      {p.receiptNumber ? (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <ExternalLink className="h-3 w-3" /> {p.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
