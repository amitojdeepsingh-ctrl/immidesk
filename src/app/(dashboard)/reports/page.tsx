"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, Download, FileText, Users, Briefcase, Calendar,
  DollarSign, TrendingUp, Activity, UserCheck,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  INTAKE: "Intake",
  DOCUMENT_COLLECTION: "Doc Collection",
  FORM_FILLING: "Form Filling",
  READY_TO_SUBMIT: "Ready to Submit",
  SUBMITTED: "Submitted",
  AOR_RECEIVED: "AOR Received",
  IN_PROCESS: "In Process",
  ADDITIONAL_DOCS_REQUESTED: "ADR",
  DECISION_MADE: "Decision Made",
  APPROVED: "Approved",
  REFUSED: "Refused",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  INTAKE: "bg-blue-500",
  DOCUMENT_COLLECTION: "bg-violet-500",
  FORM_FILLING: "bg-amber-500",
  READY_TO_SUBMIT: "bg-cyan-500",
  SUBMITTED: "bg-indigo-500",
  AOR_RECEIVED: "bg-teal-500",
  IN_PROCESS: "bg-sky-500",
  ADDITIONAL_DOCS_REQUESTED: "bg-orange-500",
  DECISION_MADE: "bg-pink-500",
  APPROVED: "bg-green-500",
  REFUSED: "bg-red-500",
  CLOSED: "bg-zinc-500",
};

const STREAM_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500",
  "bg-pink-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
  "bg-indigo-500", "bg-rose-500", "bg-lime-500", "bg-sky-500",
  "bg-violet-500", "bg-emerald-500", "bg-fuchsia-500", "bg-red-500",
  "bg-yellow-500", "bg-zinc-500", "bg-slate-500", "bg-gray-500",
];

type ReportData = {
  totalCases: number;
  activeCases: number;
  avgDaysToSubmission: number;
  invoiceCollectionRate: number;
  totalRevenue: number;
  outstandingInvoices: number;
  taskCompletionRate: number;
  overdueTasks: number;
  casesByStatus: Record<string, number>;
  casesByStream: Record<string, number>;
  workloadByConsultant: Array<{
    consultantId: string;
    consultantName: string;
    assignedCases: number;
    pendingTasks: number;
    totalTasks: number;
  }>;
};

const EXPORT_TYPES = [
  { key: "cases", label: "Cases CSV", icon: Briefcase },
  { key: "clients", label: "Clients CSV", icon: Users },
  { key: "invoices", label: "Invoices CSV", icon: DollarSign },
  { key: "tasks", label: "Tasks CSV", icon: Calendar },
  { key: "prospects", label: "Prospects CSV", icon: Activity },
  { key: "audit", label: "Audit Log CSV", icon: FileText },
] as const;

function downloadExport(type: string) {
  const a = document.createElement("a");
  a.href = `/api/reports/export?type=${type}`;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then(r => r.json())
      .then(j => { if (j.data) setData(j.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
          <p className="text-sm text-zinc-500">Organization performance and KPIs</p>
        </div>
        <p className="py-12 text-center text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
          <p className="text-sm text-zinc-500">Organization performance and KPIs</p>
        </div>
        <p className="py-12 text-center text-sm text-zinc-400">Failed to load reports data</p>
      </div>
    );
  }

  const maxStatusCount = Math.max(1, ...Object.values(data.casesByStatus));
  const maxStreamCount = Math.max(1, ...Object.values(data.casesByStream));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
        <p className="text-sm text-zinc-500">Organization performance and KPIs</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Briefcase className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500">Total Cases</span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{data.totalCases}</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500">Active Cases</span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{data.activeCases}</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500">Avg Days to Submission</span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{data.avgDaysToSubmission}</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500">Collection Rate</span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{data.invoiceCollectionRate}%</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-zinc-500">Total Revenue</span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            ${data.totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <BarChart3 className="h-4 w-4 text-zinc-500" /> Cases by Status
          </h3>
          {Object.keys(data.casesByStatus).length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400">No data</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(data.casesByStatus).map(([status, count]) => {
                const pct = Math.round((count / maxStatusCount) * 100);
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">{STATUS_LABELS[status] ?? status}</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${STATUS_COLORS[status] ?? "bg-zinc-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <BarChart3 className="h-4 w-4 text-zinc-500" /> Cases by Stream
          </h3>
          {Object.keys(data.casesByStream).length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400">No data</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(data.casesByStream).map(([stream, count], idx) => {
                const pct = Math.round((count / maxStreamCount) * 100);
                return (
                  <div key={stream}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">{stream.replace(/_/g, " ")}</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${STREAM_COLORS[idx % STREAM_COLORS.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {data.workloadByConsultant.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              <UserCheck className="h-4 w-4 text-zinc-500" /> Workload by Consultant
            </h3>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.workloadByConsultant.map(w => (
              <div key={w.consultantId} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {w.consultantName.split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{w.consultantName}</p>
                    <p className="text-xs text-zinc-500">{w.assignedCases} cases, {w.pendingTasks} pending tasks</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>{w.assignedCases} cases</span>
                  <span>{w.totalTasks} tasks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <Download className="h-4 w-4 text-zinc-500" /> Export Data
          </h3>
        </div>
        <div className="flex flex-wrap gap-3 px-4 py-4">
          {EXPORT_TYPES.map(et => (
            <button
              key={et.key}
              onClick={() => downloadExport(et.key)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <et.icon className="h-3.5 w-3.5" /> {et.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
