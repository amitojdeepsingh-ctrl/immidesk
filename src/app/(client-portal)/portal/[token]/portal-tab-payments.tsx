"use client"

import { CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

interface Payment {
  id: string
  amount: number
  currency: string
  paymentDate: string
  paymentMethod: string
  receiptNumber: string | null
  notes: string | null
}

interface PortalTabPaymentsProps {
  payments: Payment[]
  agreementStatus: string | null
  agreementSignedAt: string | null
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_CARD: "Credit Card",
  DEBIT_CARD: "Debit Card",
  PAYPAL: "PayPal",
  WISE: "Wise",
  CASH: "Cash",
  CHEQUE: "Cheque",
  OTHER: "Other",
}

function formatMethod(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency || "CAD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function PortalTabPayments({
  payments,
  agreementStatus,
  agreementSignedAt,
}: PortalTabPaymentsProps) {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const currency = payments[0]?.currency ?? "CAD"

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">
          Total Paid
        </p>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-400">No payments recorded yet.</p>
        ) : (
          <p className="text-3xl font-bold text-zinc-900">
            {formatCurrency(totalPaid, currency)}
          </p>
        )}
      </div>

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
          <CreditCard className="w-8 h-8" />
          <p className="text-sm text-center">
            No payments have been recorded yet. Your consultant will log payments here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
          {payments.map((payment) => (
            <div key={payment.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm text-zinc-500">{formatDate(payment.paymentDate)}</p>
                  <p className="text-sm text-zinc-700">{formatMethod(payment.paymentMethod)}</p>
                  {payment.receiptNumber && (
                    <span className="inline-block mt-1 text-xs text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">
                      Receipt #{payment.receiptNumber}
                    </span>
                  )}
                  {payment.notes && (
                    <p className="text-xs text-zinc-400 mt-1">{payment.notes}</p>
                  )}
                </div>
                <p className="text-base font-bold text-green-600 whitespace-nowrap">
                  {formatCurrency(payment.amount, payment.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-zinc-400 px-1">
        Government processing fees are paid directly to IRCC and are not shown here. Contact your
        consultant with any payment questions.
      </p>
    </div>
  )
}
