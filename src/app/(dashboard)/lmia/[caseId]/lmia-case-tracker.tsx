"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, XCircle, Plus, Trash2, Loader2, ExternalLink,
  ClipboardList, Users, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LmiaCase {
  id: string;
  employerName: string;
  jobTitle: string;
  nocCode: string | null;
  location: string | null;
  status: string;
  createdAt: string;
}

interface LmiaAd {
  id: string;
  platform: string;
  postUrl: string | null;
  startDate: string;
  endDate: string | null;
}

interface LmiaApplicant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  appliedDate: string;
  status: string;
  rejectionReason: string | null;
  notes: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS = [
  "Job Bank (Canada) — MANDATORY",
  "Indeed",
  "LinkedIn",
  "Workopolis",
  "Monster",
  "Glassdoor",
  "Facebook Jobs",
  "Local Newspaper",
  "Company Website",
  "Other",
];

const APPLICANT_STATUSES = [
  { value: "RECEIVED",   label: "Received" },
  { value: "INTERVIEWED",label: "Interviewed" },
  { value: "OFFERED",    label: "Offered" },
  { value: "REJECTED",   label: "Rejected" },
  { value: "WITHDRAWN",  label: "Withdrawn" },
];

const REJECTION_REASONS = [
  "Qualifications not met",
  "Insufficient experience",
  "Unavailable for work schedule",
  "Failed interview",
  "No response to offer",
  "Unable to legally work in Canada",
  "Did not pass background check",
  "Withdrew application",
  "Position filled",
  "Other",
];

const CASE_STATUSES = ["IN_PROGRESS", "APPROVED", "REFUSED", "WITHDRAWN"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysBetween(start: string, end: string | null): number {
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : Date.now();
  return Math.floor((b - a) / 86400000);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function computeCompliance(ads: LmiaAd[]) {
  const hasJobBank = ads.some(a => a.platform.toLowerCase().includes("job bank"));
  const has3Platforms = ads.length >= 3;
  const min28Days = ads.length > 0 && ads.every(a => daysBetween(a.startDate, a.endDate) >= 28);
  const within3Months = ads.some(a => {
    const days = daysBetween(a.startDate, null);
    return days <= 90;
  });
  return { hasJobBank, has3Platforms, min28Days, within3Months };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LmiaCaseTracker({
  lmiaCase,
  initialAds,
  initialApplicants,
}: {
  lmiaCase: LmiaCase;
  initialAds: LmiaAd[];
  initialApplicants: LmiaApplicant[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ads" | "applicants">("ads");
  const [ads, setAds] = useState<LmiaAd[]>(initialAds);
  const [applicants, setApplicants] = useState<LmiaApplicant[]>(initialApplicants);
  const [caseStatus, setCaseStatus] = useState(lmiaCase.status);
  const [savingStatus, setSavingStatus] = useState(false);

  // Ad form
  const [adForm, setAdForm] = useState({ platform: PLATFORMS[0], postUrl: "", startDate: "", endDate: "" });
  const [addingAd, setAddingAd] = useState(false);
  const [showAdForm, setShowAdForm] = useState(false);

  // Applicant form
  const [appForm, setAppForm] = useState({ name: "", email: "", phone: "", appliedDate: "", status: "RECEIVED", rejectionReason: "", notes: "" });
  const [addingApp, setAddingApp] = useState(false);
  const [showAppForm, setShowAppForm] = useState(false);

  const compliance = computeCompliance(ads);

  async function updateStatus(status: string) {
    setSavingStatus(true);
    await fetch(`/api/lmia/${lmiaCase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lmiaCase, status }),
    });
    setCaseStatus(status);
    setSavingStatus(false);
    router.refresh();
  }

  async function addAd(e: React.FormEvent) {
    e.preventDefault();
    if (!adForm.startDate) return;
    setAddingAd(true);
    const res = await fetch(`/api/lmia/${lmiaCase.id}/ads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: adForm.platform, postUrl: adForm.postUrl || null, startDate: adForm.startDate, endDate: adForm.endDate || null }),
    });
    const j = await res.json();
    if (j.ad) { setAds(prev => [j.ad, ...prev]); setAdForm({ platform: PLATFORMS[0], postUrl: "", startDate: "", endDate: "" }); setShowAdForm(false); }
    setAddingAd(false);
  }

  async function deleteAd(id: string) {
    await fetch(`/api/lmia/${lmiaCase.id}/ads/${id}`, { method: "DELETE" });
    setAds(prev => prev.filter(a => a.id !== id));
  }

  async function addApplicant(e: React.FormEvent) {
    e.preventDefault();
    if (!appForm.name.trim() || !appForm.appliedDate) return;
    setAddingApp(true);
    const res = await fetch(`/api/lmia/${lmiaCase.id}/applicants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...appForm, rejectionReason: appForm.rejectionReason || null, notes: appForm.notes || null }),
    });
    const j = await res.json();
    if (j.applicant) { setApplicants(prev => [j.applicant, ...prev]); setAppForm({ name: "", email: "", phone: "", appliedDate: "", status: "RECEIVED", rejectionReason: "", notes: "" }); setShowAppForm(false); }
    setAddingApp(false);
  }

  async function deleteApplicant(id: string) {
    await fetch(`/api/lmia/${lmiaCase.id}/applicants/${id}`, { method: "DELETE" });
    setApplicants(prev => prev.filter(a => a.id !== id));
  }

  const complianceRules = [
    { label: "Job Bank (Canada) posted", pass: compliance.hasJobBank, required: true },
    { label: "Minimum 3 platforms used", pass: compliance.has3Platforms, required: true },
    { label: "All ads ran ≥ 28 days", pass: compliance.min28Days, required: true },
    { label: "Ads posted within last 3 months", pass: compliance.within3Months, required: true },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/lmia" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> All LMIA Cases
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{lmiaCase.employerName}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {lmiaCase.jobTitle}
              {lmiaCase.nocCode && <span className="ml-2 text-zinc-400">· NOC {lmiaCase.nocCode}</span>}
              {lmiaCase.location && <span className="ml-2 text-zinc-400">· {lmiaCase.location}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savingStatus && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
            <select
              value={caseStatus}
              onChange={e => updateStatus(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              {CASE_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Compliance checker */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">ESDC Advertisement Compliance</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {complianceRules.map(rule => (
            <div key={rule.label} className={cn(
              "rounded-lg border p-3",
              rule.pass
                ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20"
                : "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
            )}>
              {rule.pass
                ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mb-1.5" />
                : <XCircle className="h-4 w-4 text-red-500 dark:text-red-400 mb-1.5" />}
              <p className={cn("text-xs font-medium", rule.pass ? "text-green-800 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
                {rule.label}
              </p>
            </div>
          ))}
        </div>
        {!Object.values(compliance).every(Boolean) && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Complete all 4 requirements before submitting the LMIA application to ESDC.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex gap-0">
          {([
            { id: "ads", label: "Job Advertisements", icon: ClipboardList, count: ads.length },
            { id: "applicants", label: "Applicant Log", icon: Users, count: applicants.length },
          ] as const).map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === id
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span className="ml-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Advertisements tab */}
      {activeTab === "ads" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAdForm(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            >
              <Plus className="h-3.5 w-3.5" /> Add Advertisement
            </button>
          </div>

          {showAdForm && (
            <form onSubmit={addAd} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New Advertisement</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Platform *</label>
                  <select
                    value={adForm.platform}
                    onChange={e => setAdForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Post URL (optional)</label>
                  <input
                    value={adForm.postUrl}
                    onChange={e => setAdForm(f => ({ ...f, postUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={adForm.startDate}
                    onChange={e => setAdForm(f => ({ ...f, startDate: e.target.value }))}
                    required
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={adForm.endDate}
                    onChange={e => setAdForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAdForm(false)} className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100">Cancel</button>
                <button type="submit" disabled={addingAd} className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
                  {addingAd && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                </button>
              </div>
            </form>
          )}

          {ads.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-sm text-zinc-400">No advertisements logged yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:divide-zinc-800">
              {ads.map(ad => {
                const days = daysBetween(ad.startDate, ad.endDate);
                const ok = days >= 28;
                return (
                  <div key={ad.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{ad.platform}</p>
                        {ad.postUrl && (
                          <a href={ad.postUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-600">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {fmtDate(ad.startDate)} → {ad.endDate ? fmtDate(ad.endDate) : "ongoing"} · {days} days
                      </p>
                    </div>
                    <span className={cn(
                      "text-xs font-medium rounded-full px-2 py-0.5 border",
                      ok ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"
                    )}>
                      {ok ? "✓ 28+ days" : `${days} days`}
                    </span>
                    <button onClick={() => deleteAd(ad.id)} className="text-zinc-300 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Applicants tab */}
      {activeTab === "applicants" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAppForm(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            >
              <Plus className="h-3.5 w-3.5" /> Log Applicant
            </button>
          </div>

          {showAppForm && (
            <form onSubmit={addApplicant} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New Applicant</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Full Name *</label>
                  <input value={appForm.name} onChange={e => setAppForm(f => ({ ...f, name: e.target.value }))} required
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Applied Date *</label>
                  <input type="date" value={appForm.appliedDate} onChange={e => setAppForm(f => ({ ...f, appliedDate: e.target.value }))} required
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Email</label>
                  <input type="email" value={appForm.email} onChange={e => setAppForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Phone</label>
                  <input value={appForm.phone} onChange={e => setAppForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
                  <select value={appForm.status} onChange={e => setAppForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
                    {APPLICANT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Rejection Reason</label>
                  <select value={appForm.rejectionReason} onChange={e => setAppForm(f => ({ ...f, rejectionReason: e.target.value }))}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
                    <option value="">— none —</option>
                    {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Notes</label>
                  <textarea value={appForm.notes} onChange={e => setAppForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAppForm(false)} className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100">Cancel</button>
                <button type="submit" disabled={addingApp} className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
                  {addingApp && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                </button>
              </div>
            </form>
          )}

          {applicants.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-sm text-zinc-400">No applicants logged yet</p>
              <p className="text-xs text-zinc-400 mt-1">ESDC requires documenting all Canadian/PR applicants considered</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:divide-zinc-800">
              {applicants.map(app => (
                <div key={app.id} className="flex items-start gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{app.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Applied {fmtDate(app.appliedDate)}
                      {app.email && ` · ${app.email}`}
                      {app.phone && ` · ${app.phone}`}
                    </p>
                    {app.rejectionReason && (
                      <p className="text-xs text-zinc-400 mt-0.5">Reason: {app.rejectionReason}</p>
                    )}
                    {app.notes && <p className="text-xs text-zinc-400 mt-0.5 italic">{app.notes}</p>}
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
                    app.status === "REJECTED" ? "border-red-200 bg-red-50 text-red-700" :
                    app.status === "OFFERED"   ? "border-green-200 bg-green-50 text-green-700" :
                    app.status === "INTERVIEWED" ? "border-blue-200 bg-blue-50 text-blue-700" :
                    "border-zinc-200 bg-zinc-50 text-zinc-600"
                  )}>
                    {APPLICANT_STATUSES.find(s => s.value === app.status)?.label ?? app.status}
                  </span>
                  <button onClick={() => deleteApplicant(app.id)} className="text-zinc-300 hover:text-red-500 transition-colors mt-0.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
