"use client";

import { useState, useEffect } from "react";
import { Calculator, Info, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CrsBreakdown {
  core: { age: number; education: number; language: number; secondLanguage?: number; canadianWork: number; total: number };
  spouse: { education: number; language: number; work: number };
  skillTransferability: { educationAndWork: number; languageAndEducation: number; foreignWorkAndLanguage: number; foreignWorkAndCanadianWork: number; total: number };
  additional: { canadianEducation: number; provincialNomination: number; french: number; secondLanguage: number; sibling: number; jobOffer?: number; total: number };
  total: number;
}

type ClbScores = { speaking: number; listening: number; reading: number; writing: number };

const defaultClb: ClbScores = { speaking: 0, listening: 0, reading: 0, writing: 0 };

const defaultForm = {
  age: 30,
  levelOfEducation: "bachelors",
  canadianWorkExperience: 0,
  foreignWorkExperience: 0,
  englishTest: { speaking: 7, listening: 7, reading: 7, writing: 7 },
  frenchTest: undefined as ClbScores | undefined,
  hasSpouse: false,
  spouseLevelOfEducation: "secondary",
  spouseEnglishTest: undefined as ClbScores | undefined,
  spouseFrenchTest: undefined as ClbScores | undefined,
  spouseCanadianWorkExperience: 0,
  canadianEducation: "none",
  provincialNomination: false,
  siblingInCanada: false,
  jobOffer: "none" as "none" | "teer0123" | "teer00",
  certificateOfQualification: false,
};

const CLB = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const EDU = [
  { value: "secondary", label: "Secondary (high school)" },
  { value: "oneYearDegree", label: "One-year degree/diploma" },
  { value: "twoYearDegree", label: "Two-year degree/diploma" },
  { value: "bachelors", label: "Bachelor's degree (3+ year program)" },
  { value: "twoOrMorePrograms", label: "Two or more degrees/diplomas (one 3+ yrs)" },
  { value: "masters", label: "Master's degree" },
  { value: "phd", label: "PhD" },
];

const BANDS = ["speaking", "listening", "reading", "writing"] as const;

export default function CrsPage() {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState<CrsBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);

  const update = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const updateClb = (obj: keyof typeof form, field: string, val: number) => {
    setForm(prev => {
      const current = prev[obj] as ClbScores | undefined;
      return { ...prev, [obj]: { ...current, [field]: val } as ClbScores };
    });
  };

  const toggleFrench = (on: boolean) => {
    setForm(prev => ({ ...prev, frenchTest: on ? { speaking: 7, listening: 7, reading: 7, writing: 7 } : undefined }));
  };

  const calculate = async () => {
    setCalculating(true);
    try {
      const res = await fetch("/api/crs/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.data) setResult(json.data);
    } finally {
      setCalculating(false);
    }
  };

  const inp = "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
  const lbl = "text-xs font-medium text-zinc-500";

  const ClbGrid = ({ value, onChange }: { value: ClbScores; onChange: (field: string, val: number) => void }) => (
    <div className="grid grid-cols-2 gap-3">
      {BANDS.map(band => (
        <div key={band}>
          <label className={lbl + " capitalize"}>{band}</label>
          <select value={value[band]} onChange={e => onChange(band, parseInt(e.target.value))} className={"mt-1 " + inp}>
            {CLB.map(c => <option key={c} value={c}>{c === 0 ? "—" : c}</option>)}
          </select>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">CRS Calculator</h1>
        <p className="text-sm text-zinc-500">Comprehensive Ranking System — Express Entry (updated March 2025)</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Core */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3 dark:text-zinc-50">Core / Human Capital</h2>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Age</label>
                <input type="number" value={form.age} onChange={e => update("age", parseInt(e.target.value) || 17)} min={17} max={100} className={"mt-1 " + inp} />
              </div>
              <div>
                <label className={lbl}>Education</label>
                <select value={form.levelOfEducation} onChange={e => update("levelOfEducation", e.target.value)} className={"mt-1 " + inp}>
                  {EDU.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Canadian Work Experience (years)</label>
                <input type="number" value={form.canadianWorkExperience} onChange={e => update("canadianWorkExperience", parseFloat(e.target.value) || 0)} min={0} max={10} step={0.5} className={"mt-1 " + inp} />
              </div>
              <div>
                <label className={lbl}>Foreign Work Experience (years)</label>
                <input type="number" value={form.foreignWorkExperience} onChange={e => update("foreignWorkExperience", parseFloat(e.target.value) || 0)} min={0} max={10} step={0.5} className={"mt-1 " + inp} />
              </div>
            </div>
          </div>

          {/* English Test */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">English Test (IELTS / CELPIP)</h2>
              <span className="flex items-center gap-1 text-xs text-zinc-400"><Info className="h-3 w-3" /> Enter CLB level</span>
            </div>
            <ClbGrid value={form.englishTest} onChange={(field, val) => updateClb("englishTest", field, val)} />
          </div>

          {/* French Test */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">French Test (TEF / TCF)</h2>
              <button onClick={() => toggleFrench(!form.frenchTest)}
                className={cn("rounded-md border px-3 py-1 text-xs font-medium", form.frenchTest ? "bg-brand-600 text-white dark:bg-brand-500 dark:text-white" : "text-zinc-500")}>
                {form.frenchTest ? "Included" : "Not included"}
              </button>
            </div>
            {form.frenchTest && (
              <>
                <p className="text-xs text-zinc-400 mb-3">Enter French NCLC (CLB equivalent) for each band. NCLC 7+ in all bands + English CLB 5+ in all bands = +50 points.</p>
                <ClbGrid value={form.frenchTest} onChange={(field, val) => updateClb("frenchTest", field, val)} />
              </>
            )}
          </div>

          {/* Spouse */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Spouse / Partner</h2>
              <button onClick={() => update("hasSpouse", !form.hasSpouse)}
                className={cn("rounded-md border px-3 py-1 text-xs font-medium", form.hasSpouse ? "bg-brand-600 text-white dark:bg-brand-500 dark:text-white" : "text-zinc-500")}>
                {form.hasSpouse ? "Included" : "Not included"}
              </button>
            </div>
            {form.hasSpouse && (
              <div className="space-y-4">
                <div>
                  <label className={lbl}>Education</label>
                  <select value={form.spouseLevelOfEducation} onChange={e => update("spouseLevelOfEducation", e.target.value)} className={"mt-1 " + inp}>
                    {EDU.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Canadian Work Experience (years)</label>
                  <input type="number" value={form.spouseCanadianWorkExperience} onChange={e => update("spouseCanadianWorkExperience", parseFloat(e.target.value) || 0)} min={0} max={10} step={0.5} className={"mt-1 " + inp} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={lbl}>English Test</label>
                    <button onClick={() => update("spouseEnglishTest", form.spouseEnglishTest ? undefined : { speaking: 7, listening: 7, reading: 7, writing: 7 })}
                      className={cn("rounded border px-2 py-0.5 text-xs font-medium", form.spouseEnglishTest ? "bg-brand-600 text-white" : "text-zinc-500")}>
                      {form.spouseEnglishTest ? "Included" : "Not included"}
                    </button>
                  </div>
                  {form.spouseEnglishTest && (
                    <ClbGrid value={form.spouseEnglishTest} onChange={(field, val) => updateClb("spouseEnglishTest", field, val)} />
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={lbl}>French Test</label>
                    <button onClick={() => update("spouseFrenchTest", form.spouseFrenchTest ? undefined : { speaking: 7, listening: 7, reading: 7, writing: 7 })}
                      className={cn("rounded border px-2 py-0.5 text-xs font-medium", form.spouseFrenchTest ? "bg-brand-600 text-white" : "text-zinc-500")}>
                      {form.spouseFrenchTest ? "Included" : "Not included"}
                    </button>
                  </div>
                  {form.spouseFrenchTest && (
                    <ClbGrid value={form.spouseFrenchTest} onChange={(field, val) => updateClb("spouseFrenchTest", field, val)} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Additional Points */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3 dark:text-zinc-50">Additional Points</h2>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Canadian Education</label>
                <select value={form.canadianEducation} onChange={e => update("canadianEducation", e.target.value)} className={"mt-1 " + inp}>
                  <option value="none">None</option>
                  <option value="oneYear">1-2 year program (+15)</option>
                  <option value="twoYear">3+ year program (+30)</option>
                  <option value="phd">PhD (+30)</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Valid Job Offer</label>
                <select value={form.jobOffer} onChange={e => update("jobOffer", e.target.value as "none" | "teer0123" | "teer00")} className={"mt-1 " + inp}>
                  <option value="none">None</option>
                  <option value="teer0123">TEER 0, 1, 2 or 3 (+50)</option>
                  <option value="teer00">TEER 0 — major group 00 (+200)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bonus Points */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3 dark:text-zinc-50">Bonus Points</h2>
            <div className="space-y-3">
              {[
                { key: "provincialNomination" as const, label: "Provincial Nomination (+600)" },
                { key: "siblingInCanada" as const, label: "Sibling in Canada (+15)" },
                { key: "certificateOfQualification" as const, label: "Provincial Certificate of Qualification (skilled trade)" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form[key]} onChange={e => update(key, e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-zinc-900" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={calculate} disabled={calculating}
            className="w-full rounded-md bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2 dark:bg-brand-500 dark:text-white">
            <Calculator className="h-4 w-4" />
            {calculating ? "Calculating..." : "Calculate CRS Score"}
          </button>

          {result && (
            <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Total CRS Score</p>
                <p className={cn("text-4xl font-bold mt-1",
                  result.total >= 450 ? "text-green-600" : result.total >= 400 ? "text-amber-600" : "text-zinc-600")}>
                  {result.total}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {result.total >= 450 ? "Competitive for most draws" :
                   result.total >= 400 ? "May be competitive with PNP" :
                   "Consider improving language or education"}
                </p>
              </div>
              <div className="space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase">Breakdown</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-500">Core (age, education, language, work)</span><span className="font-medium">{result.core.total}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Spouse (education, language, work)</span><span className="font-medium">{result.spouse.education + result.spouse.language + result.spouse.work}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Skill transferability</span><span className="font-medium">{result.skillTransferability.total}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Additional</span><span className="font-medium">{result.additional.total}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Share with client */}
          <ShareCard />
        </div>
      </div>
    </div>
  );
}

function ShareCard() {
  const [copied, setCopied] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/organization")
      .then(r => r.json())
      .then(j => { if (j?.data?.slug) setSlug(j.data.slug); })
      .catch(() => {});
  }, []);

  const link = typeof window === "undefined"
    ? "/crs-calculator"
    : `${window.location.origin}/crs-calculator${slug ? `?org=${slug}` : ""}`;

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-5 dark:border-brand-800/50 dark:bg-brand-500/5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <ExternalLink className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        Send to a Client
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Clients can calculate their own CRS score on this public page — their contact info and
        score are saved as a lead and appear under Leads.
      </p>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {}
        }}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-brand-300 bg-white px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:bg-transparent dark:text-brand-300 dark:hover:bg-brand-900/20"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Link copied!" : "Copy client calculator link"}
      </button>
    </div>
  );
}