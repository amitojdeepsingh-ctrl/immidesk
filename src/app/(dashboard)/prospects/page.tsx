"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Users, Upload, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

interface IntakeSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  notes: string | null;
  programType: string | null;
  submittedAt: string;
}

type PipelineData = Record<string, IntakeSubmission[]>;

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "ARCHIVED"];

const STAGE_COLORS: Record<string, string> = {
  NEW: "border-t-blue-500",
  CONTACTED: "border-t-amber-500",
  QUALIFIED: "border-t-violet-500",
  CONVERTED: "border-t-emerald-500",
  ARCHIVED: "border-t-zinc-400",
};

const STAGE_BG: Record<string, string> = {
  NEW: "bg-white dark:bg-zinc-900",
  CONTACTED: "bg-white dark:bg-zinc-900",
  QUALIFIED: "bg-white dark:bg-zinc-900",
  CONVERTED: "bg-emerald-50 dark:bg-emerald-950/20",
  ARCHIVED: "bg-zinc-50 dark:bg-zinc-900/50",
};

function stageIndex(s: string) {
  return STAGES.indexOf(s);
}

export default function ProspectsPage() {
  const [pipeline, setPipeline] = useState<PipelineData>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/prospects/pipeline");
    const json = await res.json();
    const data = (json?.data ?? {}) as PipelineData;
    for (const s of STAGES) if (!data[s]) data[s] = [];
    setPipeline(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function moveLead(leadId: string, newStatus: string) {
    await fetch("/api/prospects/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, status: newStatus }),
    });
    setPipeline(prev => {
      const next = { ...prev };
      for (const s of STAGES) next[s] = [...(prev[s] ?? [])];
      for (const s of STAGES) {
        const idx = next[s].findIndex(l => l.id === leadId);
        if (idx !== -1) {
          next[s].splice(idx, 1);
          break;
        }
      }
      next[newStatus] = [({ ...(Object.values(prev).flat().find(l => l.id === leadId) ?? {}), status: newStatus } as IntakeSubmission), ...next[newStatus]];
      return next;
    });
  }

  const totalLeads = STAGES.reduce((sum, s) => sum + (pipeline[s]?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Prospect Pipeline</h1>
          <p className="text-sm text-zinc-500">{totalLeads} total prospects</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Link href="/leads"
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-zinc-400">Loading pipeline...</div>
      ) : totalLeads === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-400">No prospects yet. Import leads to build your pipeline.</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const leads = pipeline[stage] ?? [];
            return (
              <div key={stage} className="flex w-72 shrink-0 flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{stage}</h3>
                    <Badge variant={stage === "CONVERTED" ? "success" : stage === "ARCHIVED" ? "default" : "info"}>{leads.length}</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {leads.map(lead => {
                    const idx = stageIndex(stage);
                    return (
                      <div key={lead.id} className={cn("rounded-lg border border-zinc-200 border-t-2 dark:border-zinc-700", STAGE_COLORS[stage], STAGE_BG[stage])}>
                        <div className="p-3.5 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                                {lead.firstName} {lead.lastName}
                              </p>
                              <p className="text-xs text-zinc-500 truncate">{lead.email}</p>
                            </div>
                            <Badge variant={
                              stage === "CONVERTED" ? "success" :
                              stage === "ARCHIVED" ? "default" :
                              stage === "NEW" ? "info" :
                              stage === "CONTACTED" ? "warning" : "info"
                            }>{lead.programType ?? "General"}</Badge>
                          </div>
                          {lead.notes && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{lead.notes}</p>
                          )}
                          <p className="text-[10px] text-zinc-400">{new Date(lead.submittedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1 border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
                          {idx > 0 && (
                            <button onClick={() => moveLead(lead.id, STAGES[idx - 1])}
                              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                              <ChevronLeft className="h-3 w-3" />
                            </button>
                          )}
                          <select
                            value={stage}
                            onChange={e => moveLead(lead.id, e.target.value)}
                            className="flex-1 rounded border border-zinc-200 bg-white px-1.5 py-1 text-[10px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {STAGES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          {idx < STAGES.length - 1 && (
                            <button onClick={() => moveLead(lead.id, STAGES[idx + 1])}
                              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
