"use client";

import { useState } from "react";
import { Calculator, Save, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface CrsBreakdown {
  core: { age: number; education: number; language: number; canadianWork: number; total: number };
  spouse: { education: number; language: number; work: number };
  skillTransferability: { educationAndWork: number; languageAndEducation: number; foreignWorkAndLanguage: number; foreignWorkAndCanadianWork: number; total: number };
  additional: { canadianEducation: number; provincialNomination: number; french: number; secondLanguage: number; sibling: number; total: number };
  total: number;
}

const defaultForm = {
  age: 30,
  levelOfEducation: "bachelors",
  canadianWorkExperience: 0,
  foreignWorkExperience: 0,
  firstLanguage: { speaking: 7, listening: 7, reading: 7, writing: 7 },
  secondLanguage: { speaking: 0, listening: 0, reading: 0, writing: 0 },
  hasSpouse: false,
  spouseLevelOfEducation: "secondary",
  spouseFirstLanguage: { speaking: 0, listening: 0, reading: 0, writing: 0 },
  spouseCanadianWorkExperience: 0,
  canadianEducation: "none",
  provincialNomination: false,
  frenchProficiency: false,
  siblingInCanada: false,
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

export default function CrsPage() {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState<CrsBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const update = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const updateLang = (parent: "firstLanguage" | "secondLanguage" | "spouseFirstLanguage", field: string, val: number) =>
    setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: val } }));

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

          {/* First Language */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">First Official Language</h2>
              <span className="flex items-center gap-1 text-xs text-zinc-400"><Info className="h-3 w-3" /> IELTS / CELPIP / TEF / TCF</span>
            </div>
            <p className="text-xs text-zinc-400 mb-3">Enter CLB level for each band</p>
            <div className="grid grid-cols-2 gap-3">
              {["speaking", "listening", "reading", "writing"].map(band => (
                <div key={band}>
                  <label className={lbl + " capitalize"}>{band}</label>
                  <select value={form.firstLanguage[band as keyof typeof form.firstLanguage]} onChange={e => updateLang("firstLanguage", band, parseInt(e.target.value))} className={"mt-1 " + inp}>
                    {CLB.map(c => <option key={c} value={c}>{c === 0 ? "—" : c}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Spouse */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Spouse / Partner</h2>
              <button onClick={() => update("hasSpouse", !form.hasSpouse)}
                className={cn("rounded-md border px-3 py-1 text-xs font-medium", form.hasSpouse ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "text-zinc-500")}>
                {form.hasSpouse ? "Included" : "Not included"}
              </button>
            </div>
            {form.hasSpouse && (
              <div className="space-y-3">
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
                <div className="grid grid-cols-2 gap-3">
                  {["speaking", "listening", "reading", "writing"].map(band => (
                    <div key={band}>
                      <label className={lbl + " capitalize"}>{band}</label>
                      <select value={form.spouseFirstLanguage[band as keyof typeof form.spouseFirstLanguage]} onChange={e => updateLang("spouseFirstLanguage", band, parseInt(e.target.value))} className={"mt-1 " + inp}>
                        {CLB.map(c => <option key={c} value={c}>{c === 0 ? "—" : c}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Additional */}
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
                <label className={lbl}>Second Language (CLB)</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {["speaking", "listening", "reading", "writing"].map(band => (
                    <select key={band} value={form.secondLanguage[band as keyof typeof form.secondLanguage]} onChange={e => updateLang("secondLanguage", band, parseInt(e.target.value))}
                      className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
                      {CLB.map(c => <option key={c} value={c}>{band[0].toUpperCase()} {c}</option>)}
                    </select>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3 dark:text-zinc-50">Bonus Points</h2>
            <div className="space-y-3">
              {[
                { key: "provincialNomination" as const, label: "Provincial Nomination (+600)" },
                { key: "frenchProficiency" as const, label: "French NCLC 7+ & English CLB 5+ (+50)" },
                { key: "siblingInCanada" as const, label: "Sibling in Canada (+15)" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form[key]} onChange={e => update(key, e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-zinc-900" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={calculate} disabled={calculating}
            className="w-full rounded-md bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2 dark:bg-zinc-50 dark:text-zinc-900">
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
        </div>
      </div>
    </div>
  );
}
