"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Send, CheckCircle, Trash2, FileText, Loader2, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LineItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED";
  billToName: string;
  billToEmail: string | null;
  billToPhone: string | null;
  billToAddress: string | null;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  paymentInstructions: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-zinc-100 text-zinc-600",
  SENT:      "bg-blue-100 text-blue-700",
  PAID:      "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const fmtMoney = (n: number, cur = "CAD") =>
  `${cur} $${Number(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

// ── PDF generation ────────────────────────────────────────────────────────────
async function downloadPdf(inv: Invoice) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const W = 215.9;
  const navy = [26, 54, 93] as [number, number, number];
  const grey = [120, 120, 120] as [number, number, number];

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...navy);
  doc.text("ADS Immigration", 15, 25);

  doc.setFontSize(22);
  doc.text("INVOICE", W - 15, 25, { align: "right" });

  // From
  doc.setFontSize(8);
  doc.setTextColor(...grey);
  doc.text("From", 15, 35);
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ADS Immigration", 15, 40);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.text("amitoj.deep.singh@gmail.com", 15, 45);

  // Invoice meta (right)
  const metaX = W - 15;
  const fields = [
    ["Invoice No.", inv.invoiceNumber],
    ["Invoice Date", fmtDate(inv.invoiceDate)],
    ["Due Date", inv.dueDate ? fmtDate(inv.dueDate) : "—"],
  ];
  let metaY = 35;
  for (const [label, value] of fields) {
    doc.setTextColor(...grey);
    doc.setFontSize(8);
    doc.text(label, metaX, metaY, { align: "right" });
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(value, metaX, metaY + 5, { align: "right" });
    doc.setFont("helvetica", "normal");
    metaY += 13;
  }

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(15, 60, W - 15, 60);

  // Bill To
  doc.setTextColor(...grey);
  doc.setFontSize(8);
  doc.text("Bill To", 15, 68);
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(inv.billToName, 15, 74);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  let bY = 80;
  const billLines: string[] = [];
  if (inv.billToEmail && inv.billToPhone) billLines.push(`${inv.billToEmail} | ${inv.billToPhone}`);
  else if (inv.billToEmail) billLines.push(inv.billToEmail);
  else if (inv.billToPhone) billLines.push(inv.billToPhone);
  if (inv.billToAddress) billLines.push(inv.billToAddress);
  for (const line of billLines) {
    doc.text(line, 15, bY);
    bY += 5;
  }

  // Line items table
  autoTable(doc, {
    startY: bY + 8,
    head: [["Description", "Qty", "Unit Price", "Amount"]],
    body: inv.lineItems.map(i => [
      i.description,
      String(i.qty),
      fmtMoney(i.unitPrice, inv.currency),
      fmtMoney(i.amount, inv.currency),
    ]),
    headStyles: { fillColor: navy, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
    columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 15, halign: "center" }, 2: { cellWidth: 40, halign: "right" }, 3: { cellWidth: 35, halign: "right" } },
    margin: { left: 15, right: 15 },
  });

  // Totals
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const totalsX = W - 55;
  const valX = W - 15;

  const totRows: [string, string][] = [
    ["Subtotal", fmtMoney(inv.subtotal, inv.currency)],
    [`Tax (${inv.taxRate}%)`, fmtMoney(inv.taxAmount, inv.currency)],
  ];
  let tY = finalY;
  for (const [label, val] of totRows) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(label, totalsX, tY);
    doc.text(val, valX, tY, { align: "right" });
    tY += 7;
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(totalsX, tY, valX, tY);
  tY += 5;
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total Due", totalsX, tY);
  doc.text(fmtMoney(inv.total, inv.currency), valX, tY, { align: "right" });

  // Payment instructions
  if (inv.paymentInstructions) {
    tY += 16;
    doc.setDrawColor(220, 220, 220);
    doc.line(15, tY, W - 15, tY);
    tY += 8;
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Payment Instructions", 15, tY);
    tY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(inv.paymentInstructions, W - 30) as string[];
    doc.text(lines, 15, tY);
    tY += lines.length * 5 + 8;
  }

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text("Thank you for choosing ADS Immigration. We look forward to supporting your journey.", W / 2, tY + 10, { align: "center" });

  doc.save(`${inv.invoiceNumber}.pdf`);
}

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateInvoiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (inv: Invoice) => void }) {
  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [billToPhone, setBillToPhone] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10);
  });
  const [taxRate, setTaxRate] = useState("0");
  const [paymentInstructions, setPaymentInstructions] = useState(
    "Please send payment via Interac e-Transfer to: amitoj.deep.singh@gmail.com"
  );
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", qty: 1, unitPrice: 0, amount: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function updateLine(idx: number, field: keyof LineItem, val: string | number) {
    setLineItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: field === "description" ? val : Number(val) };
      updated.amount = updated.qty * updated.unitPrice;
      return updated;
    }));
  }

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const tax = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + tax;

  async function create() {
    if (!billToName.trim()) { setErr("Bill To name is required"); return; }
    if (lineItems.some(i => !i.description.trim())) { setErr("All line items need a description"); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billToName, billToEmail, billToPhone, billToAddress, invoiceDate, dueDate, taxRate, paymentInstructions, lineItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onCreated(data);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">New Invoice</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-5 p-6">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Invoice Date</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Bill To */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Bill To — Name *</label>
            <input value={billToName} onChange={e => setBillToName(e.target.value)} className={inp} placeholder="e.g. Ravens Edu Services" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</label>
              <input type="email" value={billToEmail} onChange={e => setBillToEmail(e.target.value)} className={inp} placeholder="client@email.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Phone</label>
              <input value={billToPhone} onChange={e => setBillToPhone(e.target.value)} className={inp} placeholder="778-000-0000" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Address</label>
            <input value={billToAddress} onChange={e => setBillToAddress(e.target.value)} className={inp} placeholder="1003-8188 Fraser Street, Vancouver, BC, Canada, V5X 0J8" />
          </div>

          {/* Line Items */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Line Items</label>
            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div key={idx} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={item.description}
                      onChange={e => updateLine(idx, "description", e.target.value)}
                      className={cn(inp, "flex-1")}
                      placeholder="Description (e.g. Immigration Consulting Services — Student: ...)"
                    />
                    {lineItems.length > 1 && (
                      <button onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}
                        className="shrink-0 rounded p-1 text-zinc-400 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-zinc-500">Qty</label>
                      <input type="number" min="1" value={item.qty}
                        onChange={e => updateLine(idx, "qty", e.target.value)}
                        className={inp} />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-zinc-500">Unit Price (CAD)</label>
                      <input type="number" min="0" step="0.01" value={item.unitPrice}
                        onChange={e => updateLine(idx, "unitPrice", e.target.value)}
                        className={inp} />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-zinc-500">Amount</label>
                      <input readOnly value={item.amount.toFixed(2)} className={cn(inp, "bg-zinc-50 dark:bg-zinc-800/50")} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setLineItems(prev => [...prev, { description: "", qty: 1, unitPrice: 0, amount: 0 }])}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                <Plus className="h-3.5 w-3.5" /> Add line item
              </button>
            </div>
          </div>

          {/* Tax + Totals */}
          <div className="flex justify-end">
            <div className="w-56 space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span><span>CAD ${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-500">
                <span className="flex items-center gap-1">Tax
                  <input type="number" min="0" max="100" step="0.5" value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                    className="w-10 rounded border border-zinc-200 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800" />%
                </span>
                <span>CAD ${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-1.5 font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
                <span>Total</span><span>CAD ${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Payment Instructions</label>
            <textarea value={paymentInstructions} onChange={e => setPaymentInstructions(e.target.value)}
              rows={2} className={cn(inp, "resize-none")} />
          </div>

          {err && <p className="text-sm text-red-500">{err}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button onClick={onClose} className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">Cancel</button>
          <button onClick={create} disabled={saving}
            className="flex items-center gap-2 rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/invoices");
    const data = await res.json();
    setInvoices(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setUpdating(null);
  }

  async function deleteInvoice(id: string, num: string) {
    if (!confirm(`Delete ${num}? This cannot be undone.`)) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    setInvoices(prev => prev.filter(i => i.id !== id));
  }

  const total = invoices.reduce((s, i) => s + i.total, 0);
  const paid = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.filter(i => i.status !== "PAID" && i.status !== "CANCELLED").reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Invoices</h1>
          <p className="text-sm text-zinc-500">Create, send, and track client invoices</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
          <Plus className="h-4 w-4" /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Invoiced", value: fmtMoney(total), color: "text-zinc-900 dark:text-zinc-50" },
          { label: "Collected", value: fmtMoney(paid), color: "text-green-600" },
          { label: "Outstanding", value: fmtMoney(outstanding), color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={cn("mt-1 text-lg font-semibold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-zinc-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="py-16 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-500">No invoices yet. Create your first one.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {["Invoice #", "Bill To", "Date", "Due", "Total", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{inv.billToName}</p>
                    {inv.billToEmail && <p className="text-xs text-zinc-500">{inv.billToEmail}</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-zinc-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">{fmtMoney(inv.total, inv.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[inv.status])}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => downloadPdf(inv)} title="Download PDF"
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {inv.status === "DRAFT" && (
                        <button onClick={() => updateStatus(inv.id, "SENT")} title="Mark as Sent"
                          disabled={updating === inv.id}
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950">
                          {updating === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {(inv.status === "SENT" || inv.status === "DRAFT") && (
                        <button onClick={() => updateStatus(inv.id, "PAID")} title="Mark as Paid"
                          disabled={updating === inv.id}
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteInvoice(inv.id, inv.invoiceNumber)} title="Delete"
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateInvoiceModal onClose={() => setShowCreate(false)} onCreated={inv => setInvoices(prev => [inv, ...prev])} />
      )}
    </div>
  );
}
