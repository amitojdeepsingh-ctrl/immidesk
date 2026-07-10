"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, Phone, MapPin, Users as UsersIcon, Briefcase, Globe, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Submission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  marital_status: string | null;
  spouse_first_name: string | null;
  spouse_last_name: string | null;
  program_type: string | null;
  status: string;
  submitted_at: string;
  nationality: string | null;
  occupation: string | null;
  education_level: string | null;
  children_data: any[];
  [key: string]: any;
}

const STATUS_BADGE: Record<string, "default" | "warning" | "error" | "success"> = {
  NEW: "warning", CONTACTED: "default", QUALIFIED: "success", CONVERTED: "success", ARCHIVED: "error",
};

const STATUS_OPTIONS = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "ARCHIVED"];

export function SubmissionsList({ submissions, orgId }: { submissions: Submission[]; orgId: string }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = submissions.filter((s) => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    const q = search.toLowerCase();
    return (name.includes(q) || s.email.toLowerCase().includes(q)) &&
      (!statusFilter || s.status === statusFilter);
  });

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/intake/submit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, orgId }),
    });
    window.location.reload();
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-md border border-zinc-300 bg-white py-1.5 pl-9 pr-3 text-sm placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">No submissions found.</p>
        ) : (
          filtered.map((s) => (
            <div key={s.id}>
              <button
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {s.first_name[0]}{s.last_name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-zinc-500">{s.email} · {new Date(s.submitted_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={s.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateStatus(s.id, e.target.value)}
                    className="rounded border border-zinc-200 px-2 py-0.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {expanded === s.id ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                </div>
              </button>

              {expanded === s.id && (
                <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/30">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <h4 className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact</h4>
                      <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                        <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-zinc-400" /> {s.email}</p>
                        {s.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-zinc-400" /> {s.phone}</p>}
                        {s.nationality && <p className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-zinc-400" /> {s.nationality}</p>}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Application</h4>
                      <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {s.program_type && <p className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-zinc-400" /> {s.program_type.replace(/_/g, " ")}</p>}
                        {s.occupation && <p className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-zinc-400" /> {s.occupation}</p>}
                        {s.education_level && <p>{s.education_level}</p>}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Family</h4>
                      <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                        <p>Marital: {s.marital_status}</p>
                        {s.spouse_first_name && <p>Spouse: {s.spouse_first_name} {s.spouse_last_name}</p>}
                        {s.children_data?.length > 0 && <p>Children: {s.children_data.length}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
