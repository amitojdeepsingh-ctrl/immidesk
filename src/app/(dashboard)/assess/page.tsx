"use client";

import { useState, useEffect } from "react";
import { Search, CheckCircle2, XCircle, Loader2, AlertTriangle, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Client = { id: string; firstName: string; lastName: string; email: string };
type Case = { id: string; title: string; caseType: string; status: string };
type AssessItem = { category: string; label: string; description: string; uploaded: boolean };
type AssessResult = {
  caseId: string;
  program: string;
  client: { firstName: string; lastName: string };
  caseTitle: string;
  items: AssessItem[];
  summary: { uploaded: number; total: number; missing: number; status: string };
};

const PROGRAMS = [
  { value: "EXPRESS_ENTRY", label: "Express Entry" },
  { value: "PNP", label: "Provincial Nominee Program (PNP)" },
];

export default function AssessPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedCase, setSelectedCase] = useState("");
  const [program, setProgram] = useState("EXPRESS_ENTRY");
  const [result, setResult] = useState<AssessResult | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState("");
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
    setResult(null);
    const res = await fetch(`/api/cases?clientId=${clientId}`);
    const j = await res.json();
    setCases(j.data ?? []);
  };

  const assess = async () => {
    if (!selectedCase) return;
    setAssessing(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/assess?caseId=${selectedCase}&program=${program}`);
      const j = await res.json();
      if (j.data) setResult(j.data);
      else setError(j?.error?.message || "Assessment failed");
    } catch {
      setError("Network error");
    }
    setAssessing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <ClipboardCheck className="h-5 w-5 text-violet-600" />
          Case Assessment
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Check document completeness for Express Entry or PNP applications
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-4 sm:grid-cols-4">
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
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} — {c.email}
                  </option>
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
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500">Program</label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              {PROGRAMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={assess}
              disabled={!selectedCase || assessing}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {assessing ? <><Loader2 className="h-4 w-4 animate-spin" /> Assessing...</> : <><Search className="h-4 w-4" /> Assess</>}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              result.summary.status === "complete" ? "bg-green-100 dark:bg-green-900/20" : "bg-amber-100 dark:bg-amber-900/20",
            )}>
              {result.summary.status === "complete"
                ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                : <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {result.client.firstName} {result.client.lastName} — {result.caseTitle}
              </p>
              <p className="text-xs text-zinc-500">
                {result.summary.uploaded} of {result.summary.total} documents uploaded
                {result.summary.missing > 0 ? ` (${result.summary.missing} missing)` : ""}
              </p>
            </div>
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              result.summary.status === "complete"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            )}>
              {result.summary.status === "complete" ? "Complete" : "Incomplete"}
            </span>
          </div>

          <div className="space-y-2">
            {result.items.map((item) => (
              <div
                key={item.category}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-4 py-3 transition-colors",
                  item.uploaded
                    ? "border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10"
                    : "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/10",
                )}
              >
                <div className="flex items-center gap-3">
                  {item.uploaded
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    : <XCircle className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />}
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      item.uploaded ? "text-zinc-900 dark:text-zinc-50" : "text-red-700 dark:text-red-300",
                    )}>
                      {item.label}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.description}</p>
                  </div>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  item.uploaded
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                )}>
                  {item.uploaded ? "Uploaded" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
