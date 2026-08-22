"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, Loader2, RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";

interface SendingDomain {
  domain: string;
  status: string;
  records?: Array<{ record?: string; name?: string; type?: string; value?: string; ttl?: string }>;
}

export function EmailDomainCard() {
  const [sd, setSd] = useState<SendingDomain | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (check = false) => {
    setLoading(true);
    setError("");
    try {
      if (check) {
        await fetch("/api/organization/email-domain");
      }
      const res = await fetch("/api/organization/email-domain");
      const json = await res.json();
      setSd(json?.data ?? null);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/organization/email-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to register domain");
      setDomainInput("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
    setWorking(false);
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Globe className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Email Sending Domain
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Verify your own domain so client emails are sent from yourfirm.com instead of the platform address.
        </p>
      </div>

      <div className="space-y-4 px-6 py-5">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        ) : !sd ? (
          <form onSubmit={register} className="flex flex-wrap items-center gap-2">
            <input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="yourfirm.com"
              className="h-9 w-56 rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800"
            />
            <button
              type="submit"
              disabled={working || !domainInput.trim()}
              className="flex h-9 items-center gap-1.5 rounded-md bg-brand-600 px-3.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
              Verify a Domain
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm">{sd.domain}</span>
              {sd.status === "verified" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/25">
                  <CheckCircle2 className="h-3 w-3" /> Verified — sending from your domain
                </span>
              )}
              {(sd.status === "pending" || sd.status === "not_started") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/25">
                  <Clock className="h-3 w-3" /> Pending DNS
                </span>
              )}
              {!["verified", "pending", "not_started"].includes(sd.status) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/25">
                  <XCircle className="h-3 w-3" /> {sd.status}
                </span>
              )}
              <button onClick={() => load(true)} className="ml-auto flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <RefreshCw className="h-3 w-3" /> Check status
              </button>
            </div>

            {sd.status !== "verified" && sd.records && sd.records.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-zinc-500">Add these DNS records at your registrar:</p>
                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Type</th>
                        <th className="px-3 py-1.5 font-medium">Name</th>
                        <th className="px-3 py-1.5 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {sd.records.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-mono">{r.record ?? r.type}</td>
                          <td className="max-w-[220px] truncate px-3 py-1.5 font-mono" title={r.name}>{r.name}</td>
                          <td className="max-w-[320px] truncate px-3 py-1.5 font-mono" title={r.value}>{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  DNS can take up to 48h to propagate. Click “Check status” after adding the records.
                </p>
              </div>
            )}

            {sd.status !== "verified" && (
              <form onSubmit={register} className="flex items-center gap-2 pt-1">
                <input
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="Switch to another domain…"
                  className="h-8 w-52 rounded-md border border-zinc-300 bg-white px-2.5 text-xs focus:border-brand-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800"
                />
                <button type="submit" disabled={working} className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400">
                  Register
                </button>
              </form>
            )}
          </div>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </section>
  );
}
