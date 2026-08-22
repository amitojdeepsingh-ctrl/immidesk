"use client";

import { useState, useEffect } from "react";
import { FileText, Loader2, Copy, Check, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Client = { id: string; firstName: string; lastName: string; email: string };
type Case = { id: string; title: string; caseType: string; status: string };

const DOC_TYPES = [
  { value: "SOP", label: "Statement of Purpose (SOP)", desc: "Letter explaining applicant's intent to immigrate for IRCC" },
  { value: "ICCRC_COMMUNICATION", label: "ICCRC Communication", desc: "Formal correspondence to the College of Immigration Consultants" },
];

export default function CorrespondencePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedCase, setSelectedCase] = useState("");
  const [docType, setDocType] = useState("SOP");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => { if (j.data) setClients(j.data); })
      .finally(() => setLoadingClients(false));
  }, []);

  const loadCases = async (clientId: string) => {
    setSelectedClient(clientId);
    setSelectedCase("");
    setResult("");
    const res = await fetch(`/api/cases?clientId=${clientId}`);
    const j = await res.json();
    setCases(j.data ?? []);
  };

  const generate = async () => {
    if (!selectedCase) return;
    setGenerating(true);
    setResult("");
    try {
      const res = await fetch("/api/correspondence/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCase, docType, notes }),
      });
      const j = await res.json();
      if (j.data?.content) setResult(j.data.content);
    } finally {
      setGenerating(false);
    }
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <FileText className="h-5 w-5 text-emerald-600" />
          Correspondence Studio
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Generate SOP (Statement of Purpose) letters and ICCRC communications
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-500">Client</label>
            {loadingClients ? (
              <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading...
              </div>
            ) : (
              <select
                value={selectedClient}
                onChange={(e) => loadCases(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.email}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500">Case</label>
            <select
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
              disabled={!selectedClient}
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              <option value="">Select a case...</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-zinc-500">Document Type</label>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {DOC_TYPES.map((dt) => (
              <button
                key={dt.value}
                onClick={() => setDocType(dt.value)}
                className={cn(
                  "rounded-md border px-4 py-3 text-left transition-colors",
                  docType === dt.value
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700",
                )}
              >
                <p className={cn("text-sm font-medium", docType === dt.value ? "text-emerald-700 dark:text-emerald-300" : "text-zinc-900 dark:text-zinc-50")}>
                  {dt.label}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{dt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-zinc-500">Additional Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any specific details to include..."
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:border-brand-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>

        <button
          onClick={generate}
          disabled={!selectedCase || generating}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Generate</>
          )}
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {docType === "SOP" ? "Statement of Purpose" : "ICCRC Communication"}
              </span>
              <span className="text-xs text-zinc-400">generated</span>
            </div>
            <button
              onClick={copyResult}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
            >
              {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
            </button>
          </div>
          <div className="overflow-auto p-5">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
