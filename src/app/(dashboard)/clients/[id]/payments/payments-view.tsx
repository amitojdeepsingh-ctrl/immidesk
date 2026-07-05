"use client";

import { useState } from "react";
import { CreditCard, Plus, Trash2, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  paidAt: string;
  createdAt: string;
}

interface PaymentsViewProps {
  clientId: string;
  organizationId: string;
  payments: Payment[];
  tableReady: boolean;
}

const SQL_TO_RUN = `CREATE TABLE IF NOT EXISTS "Payment" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clientId"       TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "amount"         NUMERIC(12,2) NOT NULL,
  "currency"       TEXT NOT NULL DEFAULT 'CAD',
  "description"    TEXT,
  "paidAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Payment_clientId_idx" ON "Payment"("clientId");
CREATE INDEX IF NOT EXISTS "Payment_organizationId_idx" ON "Payment"("organizationId");`;

export function PaymentsView({ clientId, organizationId, payments: initialPayments, tableReady }: PaymentsViewProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    amount: "",
    currency: "CAD",
    description: "",
    paidAt: new Date().toISOString().slice(0, 10),
  });

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  async function handleAdd() {
    if (!form.amount || isNaN(Number(form.amount))) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          currency: form.currency,
          description: form.description || null,
          paidAt: new Date(form.paidAt).toISOString(),
          organizationId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      setPayments((prev) => [json.payment, ...prev]);
      setForm({ amount: "", currency: "CAD", description: "", paidAt: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save payment");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/clients/${clientId}/payments/${id}`, { method: "DELETE" });
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Failed to delete payment");
    }
  }

  function copySQL() {
    navigator.clipboard.writeText(SQL_TO_RUN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!tableReady) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Payments</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Payment table not set up yet
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Run this SQL in your{" "}
                <a
                  href="https://supabase.com/dashboard/project/hcilbqzipmpxqektvzgk/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Supabase SQL Editor
                </a>{" "}
                to enable payment tracking:
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded-md bg-amber-100 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {SQL_TO_RUN}
                </pre>
                <button
                  onClick={copySQL}
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-amber-200 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-300 dark:bg-amber-900 dark:text-amber-300"
                >
                  {copied ? <Check className="h-3 w-3" /> : null}
                  {copied ? "Copied!" : "Copy SQL"}
                </button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                After running, refresh this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Payments</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {payments.length} record{payments.length !== 1 ? "s" : ""} &middot; Total{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {formatCurrency(total, payments[0]?.currency ?? "CAD")}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Add Payment
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">New Payment</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option>CAD</option>
                <option>USD</option>
                <option>INR</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Date Paid *</label>
              <input
                type="date"
                value={form.paidAt}
                onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Description</label>
              <input
                type="text"
                placeholder="e.g. Retainer fee"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !form.amount}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {saving ? "Saving…" : "Save Payment"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-12 text-center dark:border-zinc-700">
          <CreditCard className="mx-auto mb-2 h-6 w-6 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No payments recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Description</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Amount</th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                    {new Date(p.paidAt).toLocaleDateString("en-CA")}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                    {p.description ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amount);
}
