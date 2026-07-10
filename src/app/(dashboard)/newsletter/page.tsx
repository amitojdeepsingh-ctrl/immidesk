"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Users, CheckCircle2, Loader2 } from "lucide-react";
import { CASE_TYPE_LABELS } from "@/lib/checklists";

const ALL_TYPES = [["ALL", "All Clients"], ...Object.entries(CASE_TYPE_LABELS)] as [string, string][];

function NewsletterForm() {
  const searchParams = useSearchParams();
  const [caseType, setCaseType] = useState(searchParams.get("caseType") ?? "ALL");
  const [subject, setSubject] = useState(decodeURIComponent(searchParams.get("subject") ?? ""));
  const [body, setBody] = useState(decodeURIComponent(searchParams.get("body") ?? ""));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-populate if navigated from draws page — initial state already reads searchParams
  useEffect(() => {
    const s = searchParams.get("subject");
    const b = searchParams.get("body");
    const c = searchParams.get("caseType");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s) setSubject(decodeURIComponent(s));
    if (b) setBody(decodeURIComponent(b));
    if (c) setCaseType(c);
  }, [searchParams]);

  async function send() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, caseType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setResult(json);
      setSubject(""); setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const inputCls = "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Newsletter</h1>
        <p className="mt-1 text-sm text-zinc-500">Send an update to your clients. Filter by application type to send targeted messages.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Send To</label>
          <select value={caseType} onChange={e => setCaseType(e.target.value)} className={inputCls}>
            {ALL_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Subject Line</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
            className={inputCls} placeholder="e.g. New Express Entry Draw — CRS 485" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Message <span className="font-normal text-zinc-400">(use **bold** for emphasis)</span>
          </label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
            className={`${inputCls} resize-none`}
            placeholder={`Hi [Client Name],\n\nWe wanted to share an important update...\n\nBest regards,\nADS Immigration Services`} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {result && (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Sent to {result.sent} of {result.total} clients successfully.
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={send} disabled={!subject.trim() || !body.trim() || sending}
            className="flex items-center gap-2 rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900">
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send Newsletter</>}
          </button>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Users className="h-3.5 w-3.5" />
            {caseType === "ALL" ? "All clients" : CASE_TYPE_LABELS[caseType]} will receive this
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tips</p>
        <ul className="space-y-1 text-xs text-zinc-500">
          <li>• Use **text** to make text <strong>bold</strong> in the email</li>
          <li>• Each client receives a personalized email addressed to their first name</li>
          <li>• Go to <strong>News &amp; Draws</strong> and click &ldquo;Send to Clients&rdquo; on any draw to pre-fill this form</li>
          <li>• Express Entry draws auto-target Express Entry clients, PNP draws target PNP clients</li>
        </ul>
      </div>
    </div>
  );
}

export default function NewsletterPage() {
  return (
    <Suspense>
      <NewsletterForm />
    </Suspense>
  );
}
