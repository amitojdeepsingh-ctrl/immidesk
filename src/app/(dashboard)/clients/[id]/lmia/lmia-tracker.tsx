"use client";

import { useState } from "react";
import {
  Plus, Trash2, CheckCircle2, XCircle, AlertTriangle, Clock,
  Briefcase, Users, ExternalLink, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LmiaAd {
  id: string;
  platform: string;
  url: string | null;
  jobTitle: string | null;
  wage: string | null;
  datePosted: string;
  dateEnded: string | null;
  notes: string | null;
}

interface LmiaApplicant {
  id: string;
  name: string;
  contactDate: string;
  isCanadian: boolean;
  reasonNotHired: string | null;
  notes: string | null;
}

const PLATFORMS = [
  "Job Bank (Canada) — MANDATORY",
  "Indeed",
  "LinkedIn",
  "Company Website",
  "Workopolis",
  "Monster",
  "ZipRecruiter",
  "Facebook Jobs",
  "Local Newspaper",
  "Trade Publication",
  "School / College Board",
  "Job Fair",
  "Other",
];

const REJECTION_REASONS = [
  "Insufficient qualifications / experience",
  "Did not meet education requirements",
  "Failed skills assessment / test",
  "No response to job offer",
  "Withdrew application",
  "Salary expectations too high",
  "Not available for required hours/schedule",
  "Failed background check",
  "Offered position to more qualified candidate",
  "Other",
];

function daysBetween(start: string, end: string | null): number {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  return Math.floor((e - s) / (1000 * 60 * 60 * 24));
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function computeCompliance(ads: LmiaAd[]) {
  const hasJobBank = ads.some(a => a.platform.toLowerCase().includes("job bank"));
  const uniquePlatforms = new Set(ads.map(a => a.platform.split(" —")[0].trim())).size;
  const has3Platforms = uniquePlatforms >= 3;
  const min28Days = ads.length > 0 && ads.every(a => daysBetween(a.datePosted, a.dateEnded) >= 28);
  const within3Months = ads.length > 0 && ads.every(a => {
    const posted = new Date(a.datePosted);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return posted >= threeMonthsAgo;
  });

  return { hasJobBank, has3Platforms, uniquePlatforms, min28Days, within3Months };
}

export function LmiaTracker({
  clientId,
  initialAds,
  initialApplicants,
}: {
  clientId: string;
  initialAds: LmiaAd[];
  initialApplicants: LmiaApplicant[];
}) {
  const [ads, setAds] = useState<LmiaAd[]>(initialAds);
  const [applicants, setApplicants] = useState<LmiaApplicant[]>(initialApplicants);
  const [tab, setTab] = useState<"ads" | "applicants">("ads");
  const [showAdForm, setShowAdForm] = useState(false);
  const [showApplicantForm, setShowApplicantForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [adForm, setAdForm] = useState({
    platform: "", url: "", jobTitle: "", wage: "", datePosted: "", dateEnded: "", notes: "",
  });
  const [appForm, setAppForm] = useState({
    name: "", contactDate: "", isCanadian: false, reasonNotHired: "", notes: "",
  });

  const compliance = computeCompliance(ads);

  async function submitAd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/lmia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adForm, type: "ad" }),
      });
      const j = await res.json();
      if (j.ad) {
        setAds(prev => [j.ad, ...prev]);
        setAdForm({ platform: "", url: "", jobTitle: "", wage: "", datePosted: "", dateEnded: "", notes: "" });
        setShowAdForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function submitApplicant(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/lmia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...appForm, type: "applicant" }),
      });
      const j = await res.json();
      if (j.applicant) {
        setApplicants(prev => [j.applicant, ...prev]);
        setAppForm({ name: "", contactDate: "", isCanadian: false, reasonNotHired: "", notes: "" });
        setShowApplicantForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string, type: "ad" | "applicant") {
    setDeleting(id);
    try {
      await fetch(`/api/clients/${clientId}/lmia/${id}?type=${type}`, { method: "DELETE" });
      if (type === "ad") setAds(prev => prev.filter(a => a.id !== id));
      else setApplicants(prev => prev.filter(a => a.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const inputCls = "h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";
  const labelCls = "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">LMIA Advertisement Tracker</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Track recruitment efforts to demonstrate Canadians were given priority before hiring a foreign worker.</p>
        </div>
      </div>

      {/* Compliance Dashboard */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">ESDC Compliance Checklist</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              ok: compliance.hasJobBank,
              label: "Job Bank Canada included",
              detail: "Required on all LMIA applications",
            },
            {
              ok: compliance.has3Platforms,
              label: `${compliance.uniquePlatforms} of 3 required platforms`,
              detail: "Job Bank + at least 2 other job boards",
            },
            {
              ok: compliance.min28Days,
              label: "All ads ran ≥ 28 days",
              detail: ads.length === 0 ? "No ads logged yet" : ads.map(a => `${a.platform.split(" —")[0]}: ${daysBetween(a.datePosted, a.dateEnded)}d`).join(" · "),
            },
            {
              ok: compliance.within3Months,
              label: "Ads within last 3 months",
              detail: "Recruitment must be within 3 months of LMIA submission",
            },
          ].map(({ ok, label, detail }) => (
            <div key={label} className={cn(
              "flex items-start gap-3 rounded-lg border p-3",
              ok ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20"
                 : ads.length === 0 ? "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
                 : "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
            )}>
              {ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <XCircle className={cn("mt-0.5 h-4 w-4 shrink-0", ads.length === 0 ? "text-zinc-400" : "text-red-500")} />
              )}
              <div>
                <p className={cn("text-sm font-medium", ok ? "text-green-800 dark:text-green-300" : ads.length === 0 ? "text-zinc-600 dark:text-zinc-400" : "text-red-800 dark:text-red-300")}>{label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        {ads.length > 0 && compliance.hasJobBank && compliance.has3Platforms && compliance.min28Days && compliance.within3Months && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-300 bg-green-100 px-4 py-2.5 dark:border-green-800 dark:bg-green-950/30">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-semibold text-green-800 dark:text-green-300">Advertisement requirements met — ready for LMIA submission</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex gap-0">
          {[
            { key: "ads", label: "Job Advertisements", count: ads.length, icon: Briefcase },
            { key: "applicants", label: "Applicant Log", count: applicants.length, icon: Users },
          ].map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as "ads" | "applicants")}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === key
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-xs",
                tab === key ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
              )}>{count}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ADS TAB */}
      {tab === "ads" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Minimum: Job Bank + 2 other platforms, each running ≥ 28 consecutive days
            </div>
            <button
              onClick={() => setShowAdForm(!showAdForm)}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
            >
              <Plus className="h-3.5 w-3.5" /> Add Advertisement
            </button>
          </div>

          {showAdForm && (
            <form onSubmit={submitAd} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">New Advertisement</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Platform *</label>
                  <select value={adForm.platform} onChange={e => setAdForm(p => ({ ...p, platform: e.target.value }))} required className={inputCls}>
                    <option value="">Select platform…</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Job Title</label>
                  <input value={adForm.jobTitle} onChange={e => setAdForm(p => ({ ...p, jobTitle: e.target.value }))} className={inputCls} placeholder="e.g. Cook, NOC 63200" />
                </div>
                <div>
                  <label className={labelCls}>Offered Wage</label>
                  <input value={adForm.wage} onChange={e => setAdForm(p => ({ ...p, wage: e.target.value }))} className={inputCls} placeholder="e.g. $18.00/hr" />
                </div>
                <div>
                  <label className={labelCls}>Date Posted *</label>
                  <input type="date" required value={adForm.datePosted} onChange={e => setAdForm(p => ({ ...p, datePosted: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Date Ended (leave blank if still active)</label>
                  <input type="date" value={adForm.dateEnded} onChange={e => setAdForm(p => ({ ...p, dateEnded: e.target.value }))} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Ad URL</label>
                  <input type="url" value={adForm.url} onChange={e => setAdForm(p => ({ ...p, url: e.target.value }))} className={inputCls} placeholder="https://ca.indeed.com/..." />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Notes</label>
                  <input value={adForm.notes} onChange={e => setAdForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} placeholder="Number of responses, additional context…" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
                  {saving ? "Saving…" : "Save Advertisement"}
                </button>
                <button type="button" onClick={() => setShowAdForm(false)} className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {ads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
              <Briefcase className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm text-zinc-500">No advertisements logged yet</p>
              <p className="mt-1 text-xs text-zinc-400">Add Job Bank first, then at least 2 other platforms</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ads.map(ad => {
                const days = daysBetween(ad.datePosted, ad.dateEnded);
                const meetsMin = days >= 28;
                const isJobBank = ad.platform.toLowerCase().includes("job bank");
                return (
                  <div key={ad.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
                            {ad.platform.split(" —")[0]}
                          </span>
                          {isJobBank && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Required</span>
                          )}
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            meetsMin ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                     : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          )}>
                            <Clock className="h-3 w-3" />
                            {days} days {ad.dateEnded ? "" : "(ongoing)"}
                            {meetsMin ? " ✓" : " — needs 28+"}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                          {ad.jobTitle && <span>Job: {ad.jobTitle}</span>}
                          {ad.wage && <span>Wage: {ad.wage}</span>}
                          <span>Posted: {fmt(ad.datePosted)}</span>
                          {ad.dateEnded && <span>Ended: {fmt(ad.dateEnded)}</span>}
                        </div>
                        {ad.url && (
                          <a href={ad.url} target="_blank" rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                            <ExternalLink className="h-3 w-3" /> View ad
                          </a>
                        )}
                        {ad.notes && <p className="mt-1 text-xs text-zinc-400">{ad.notes}</p>}
                      </div>
                      <button
                        onClick={() => deleteItem(ad.id, "ad")}
                        disabled={deleting === ad.id}
                        className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* APPLICANTS TAB */}
      {tab === "applicants" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">Log every Canadian/PR who applied and why they were not selected. This is required for the LMIA application.</p>
            <button
              onClick={() => setShowApplicantForm(!showApplicantForm)}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
            >
              <Plus className="h-3.5 w-3.5" /> Add Applicant
            </button>
          </div>

          {showApplicantForm && (
            <form onSubmit={submitApplicant} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Log Applicant Response</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Applicant Name *</label>
                  <input required value={appForm.name} onChange={e => setAppForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Full name or initials" />
                </div>
                <div>
                  <label className={labelCls}>Date Contacted *</label>
                  <input type="date" required value={appForm.contactDate} onChange={e => setAppForm(p => ({ ...p, contactDate: e.target.value }))} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Canadian Citizen or Permanent Resident?</label>
                  <div className="flex gap-4 mt-1.5">
                    {[true, false].map(v => (
                      <label key={String(v)} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="isCanadian" checked={appForm.isCanadian === v}
                          onChange={() => setAppForm(p => ({ ...p, isCanadian: v }))}
                          className="accent-zinc-900" />
                        {v ? "Yes — Canadian / PR" : "No — Foreign national"}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Reason Not Hired</label>
                  <select value={appForm.reasonNotHired} onChange={e => setAppForm(p => ({ ...p, reasonNotHired: e.target.value }))} className={inputCls}>
                    <option value="">Select reason…</option>
                    {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Additional Notes</label>
                  <input value={appForm.notes} onChange={e => setAppForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} placeholder="Interview notes, qualifications reviewed, etc." />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
                  {saving ? "Saving…" : "Save Applicant"}
                </button>
                <button type="button" onClick={() => setShowApplicantForm(false)} className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {applicants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
              <Users className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm text-zinc-500">No applicant responses logged yet</p>
              <p className="mt-1 text-xs text-zinc-400">Log all Canadians/PRs who applied and why they were not hired</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-0 border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                <span>Name</span>
                <span className="px-4">Status</span>
                <span>Reason Not Hired</span>
                <span />
              </div>
              {applicants.map((a, i) => (
                <div key={a.id} className={cn(
                  "grid grid-cols-[1fr_auto_1fr_auto] items-start gap-0 px-4 py-3",
                  i !== 0 && "border-t border-zinc-100 dark:border-zinc-800",
                )}>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{a.name}</p>
                    <p className="text-xs text-zinc-400">{fmt(a.contactDate)}</p>
                  </div>
                  <div className="px-4">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      a.isCanadian ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                    )}>
                      {a.isCanadian ? "CA / PR" : "Foreign"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{a.reasonNotHired ?? "—"}</p>
                    {a.notes && <p className="text-xs text-zinc-400">{a.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteItem(a.id, "applicant")}
                    disabled={deleting === a.id}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {applicants.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-xs text-zinc-500">
                <strong className="text-zinc-700 dark:text-zinc-300">{applicants.filter(a => a.isCanadian).length}</strong> Canadian/PR applicants · <strong className="text-zinc-700 dark:text-zinc-300">{applicants.length}</strong> total responses logged
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
