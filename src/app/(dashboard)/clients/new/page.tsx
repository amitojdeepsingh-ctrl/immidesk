"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, ExternalLink, UserPlus, Target } from "lucide-react";
import { CASE_TYPE_LABELS } from "@/lib/checklists";
import { cn } from "@/lib/utils";

interface Links {
  clientId: string;
  caseId: string;
  portalLink: string;
  agreementLink: string;
}

export default function NewClientPage() {
  const searchParams = useSearchParams();
  const isLead = searchParams.get("lead") === "true";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    caseType: "EXPRESS_ENTRY",
    fee: "",
    currency: "CAD",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<Links | null>(null);
  const [copied, setCopied] = useState<"portal" | "agreement" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags: isLead ? ["lead"] : [] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create client");
      setLinks(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  function copy(text: string, which: "portal" | "agreement") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  const inputCls = "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

  if (links) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {isLead ? "Lead Added!" : "Client Added!"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {form.firstName} {form.lastName} has been {isLead ? "added as a lead" : "created"}
            {!isLead && ". Send these two links to your client."}
          </p>
        </div>

        {!isLead && (
          <>
            {/* Portal Link */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">1</div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Client Intake Portal</h2>
              </div>
              <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                Client fills their personal details, immigration information, and uploads all required documents.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {links.portalLink}
                </code>
                <button onClick={() => copy(links.portalLink, "portal")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  {copied === "portal" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-zinc-500" />}
                </button>
                <a href={links.portalLink} target="_blank" rel="noreferrer"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
                </a>
              </div>
            </div>

            {/* Agreement Link */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">2</div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Service Agreement</h2>
              </div>
              <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                Client views and signs the service agreement with the fee you entered. You&apos;ll be notified once signed.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {links.agreementLink}
                </code>
                <button onClick={() => copy(links.agreementLink, "agreement")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  {copied === "agreement" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-zinc-500" />}
                </button>
                <a href={links.agreementLink} target="_blank" rel="noreferrer"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
                </a>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <Link href={`/clients/${links.clientId}`}
            className="flex-1 rounded-md bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
            View Profile
          </Link>
          <button onClick={() => { setLinks(null); setForm({ firstName: "", lastName: "", email: "", phone: "", caseType: "EXPRESS_ENTRY", fee: "", currency: "CAD" }); }}
            className="flex-1 rounded-md border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">
            Add Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <div className="flex items-center gap-3">
        <Link href="/clients"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            {isLead ? <><Target className="h-4 w-4 text-amber-500" /> Add Lead</> : <><UserPlus className="h-4 w-4" /> New Client</>}
          </h1>
          <p className="text-xs text-zinc-500">
            {isLead
              ? "Track a prospect — convert to client when they sign up"
              : "Enter the basics — intake portal and agreement links are generated automatically"}
          </p>
        </div>
      </div>

      {isLead && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/10">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Lead mode:</strong> This person will appear in your Leads tab. Once they pay and sign up, you can convert them to a client from their profile.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {isLead ? <Target className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {isLead ? "Lead Details" : "Client Details"}
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">First Name *</label>
                <input type="text" value={form.firstName} required
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className={inputCls} placeholder="Harpreet" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Last Name *</label>
                <input type="text" value={form.lastName} required
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className={inputCls} placeholder="Singh" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Email Address *</label>
              <input type="email" value={form.email} required
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={inputCls} placeholder="prospect@email.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Phone Number</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className={inputCls} placeholder="+1 (416) 555-0100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Interested In</label>
              <select value={form.caseType}
                onChange={e => setForm(f => ({ ...f, caseType: e.target.value }))}
                className={inputCls}>
                {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!isLead && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Service Fee</h2>
            <p className="mb-4 text-xs text-zinc-500">This will appear in the service agreement the client signs.</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Amount</label>
                <input type="number" min="0" step="0.01" value={form.fee}
                  onChange={e => setForm(f => ({ ...f, fee: e.target.value }))}
                  className={inputCls} placeholder="2500.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={inputCls}>
                  <option>CAD</option>
                  <option>USD</option>
                  <option>INR</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={saving}
          className={cn("w-full rounded-md py-2.5 text-sm font-medium disabled:opacity-50",
            isLead
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200")}>
          {saving ? "Saving…" : isLead ? "Add Lead" : "Create Client & Generate Links"}
        </button>
      </form>
    </div>
  );
}
