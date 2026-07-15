"use client";

import { useState, useMemo } from "react";
import { Calculator, Send, CheckCircle2, Loader2, User, Info } from "lucide-react";
import { calculateCRS } from "@/lib/crs/scoring";
import type { CRSInput, CRSBreakdown } from "@/lib/crs/scoring";

const CLB = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const EDU = [
  { value: "secondary", label: "Secondary (high school)" },
  { value: "oneYearDegree", label: "One-year degree/diploma" },
  { value: "twoYearDegree", label: "Two-year degree/diploma" },
  { value: "bachelors", label: "Bachelor's degree (3+ year program)" },
  { value: "twoOrMorePrograms", label: "Two or more degrees/diplomas (one must be 3+ yrs)" },
  { value: "masters", label: "Master's degree" },
  { value: "phd", label: "PhD" },
];

const defaultForm = {
  firstName: "", lastName: "", email: "", phone: "",
  age: 30,
  levelOfEducation: "bachelors" as CRSInput["levelOfEducation"],
  canadianWorkExperience: 0,
  foreignWorkExperience: 0,
  firstLanguage: { speaking: 7, listening: 7, reading: 7, writing: 7 },
  secondLanguage: { speaking: 0, listening: 0, reading: 0, writing: 0 },
  hasSpouse: false,
  spouseLevelOfEducation: "secondary" as CRSInput["spouseLevelOfEducation"],
  spouseFirstLanguage: { speaking: 0, listening: 0, reading: 0, writing: 0 },
  spouseCanadianWorkExperience: 0,
  canadianEducation: "none" as CRSInput["canadianEducation"],
  provincialNomination: false,
  frenchProficiency: false,
  siblingInCanada: false,
};

function buildCRSInput(form: typeof defaultForm): CRSInput {
  return {
    age: form.age,
    levelOfEducation: form.levelOfEducation,
    canadianWorkExperience: form.canadianWorkExperience,
    foreignWorkExperience: form.foreignWorkExperience,
    firstLanguage: form.firstLanguage,
    secondLanguage: form.secondLanguage.speaking > 0 || form.secondLanguage.listening > 0 || form.secondLanguage.reading > 0 || form.secondLanguage.writing > 0
      ? form.secondLanguage : undefined,
    hasSpouse: form.hasSpouse,
    spouseLevelOfEducation: form.hasSpouse ? form.spouseLevelOfEducation : undefined,
    spouseFirstLanguage: form.hasSpouse && form.spouseFirstLanguage.speaking > 0 ? form.spouseFirstLanguage : undefined,
    spouseCanadianWorkExperience: form.hasSpouse ? form.spouseCanadianWorkExperience : undefined,
    canadianEducation: form.canadianEducation,
    provincialNomination: form.provincialNomination,
    frenchProficiency: form.frenchProficiency,
    siblingInCanada: form.siblingInCanada,
  };
}

export default function CrsCalculatorPage() {
  const [form, setForm] = useState(defaultForm);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const result = useMemo(() => calculateCRS(buildCRSInput(form)), [form]);

  const update = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const updateLang = (parent: "firstLanguage" | "secondLanguage" | "spouseFirstLanguage", field: string, val: number) =>
    setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: val } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) return;
    setSending(true);
    try {
      await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || "",
          programType: "EXPRESS_ENTRY",
          educationLevel: EDU.find(e => e.value === form.levelOfEducation)?.label || form.levelOfEducation,
          notes: JSON.stringify({ crsScore: result.total, crsBreakdown: result }),
        }),
      });
      setSubmitted(true);
    } catch {}
    setSending(false);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 text-lg font-semibold text-zinc-900">Score Calculated!</h1>
          <p className="mt-2 text-5xl font-bold text-zinc-900">{result.total}</p>
          <p className="mt-1 text-sm text-zinc-500">Your CRS score has been saved. A consultant will contact you.</p>
        </div>
      </div>
    );
  }

  const inp = "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";
  const lbl = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">CRS Score Calculator</h1>
          <p className="mt-1 text-sm text-zinc-500">Comprehensive Ranking System — Express Entry. Fill in your details to estimate your score.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Lead capture */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50"><User className="h-4 w-4" /> Your Contact Info</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={lbl}>First Name <span className="text-red-500">*</span></label><input value={form.firstName} onChange={e => update("firstName", e.target.value)} required className={inp} placeholder="John" /></div>
              <div><label className={lbl}>Last Name <span className="text-red-500">*</span></label><input value={form.lastName} onChange={e => update("lastName", e.target.value)} required className={inp} placeholder="Doe" /></div>
              <div><label className={lbl}>Email <span className="text-red-500">*</span></label><input type="email" value={form.email} onChange={e => update("email", e.target.value)} required className={inp} placeholder="john@example.com" /></div>
              <div><label className={lbl}>Phone</label><input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} className={inp} placeholder="+1 (604) 555-0123" /></div>
            </div>
          </div>

          {/* Core */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Core / Human Capital</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={lbl}>Age</label>
                <input type="number" value={form.age} onChange={e => update("age", parseInt(e.target.value) || 17)} min={17} max={100} className={inp} />
              </div>
              <div>
                <label className={lbl}>Education</label>
                <select value={form.levelOfEducation} onChange={e => update("levelOfEducation", e.target.value as any)} className={inp}>
                  {EDU.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Canadian Work Experience (years)</label>
                <input type="number" value={form.canadianWorkExperience} onChange={e => update("canadianWorkExperience", parseFloat(e.target.value) || 0)} min={0} max={10} step={0.5} className={inp} />
              </div>
              <div>
                <label className={lbl}>Foreign Work Experience (years)</label>
                <input type="number" value={form.foreignWorkExperience} onChange={e => update("foreignWorkExperience", parseFloat(e.target.value) || 0)} min={0} max={10} step={0.5} className={inp} />
              </div>
            </div>
          </div>

          {/* First Language */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">First Official Language (CLB)</h2>
              <span className="flex items-center gap-1 text-xs text-zinc-400"><Info className="h-3 w-3" /> IELTS / CELPIP / TEF / TCF</span>
            </div>
            <p className="mb-3 text-xs text-zinc-400">Enter your CLB level for each skill (0 if not tested)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["speaking", "listening", "reading", "writing"].map(band => (
                <div key={band}>
                  <label className={lbl + " capitalize"}>{band}</label>
                  <select value={form.firstLanguage[band as keyof typeof form.firstLanguage]} onChange={e => updateLang("firstLanguage", band, parseInt(e.target.value))} className={inp}>
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
              <button type="button" onClick={() => update("hasSpouse", !form.hasSpouse)}
                className={`rounded-md border px-3 py-1 text-xs font-medium ${form.hasSpouse ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "text-zinc-500"}`}>
                {form.hasSpouse ? "Included" : "Not included"}
              </button>
            </div>
            {form.hasSpouse && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Education</label>
                    <select value={form.spouseLevelOfEducation} onChange={e => update("spouseLevelOfEducation", e.target.value as any)} className={inp}>
                      {EDU.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Canadian Work Experience (years)</label>
                    <input type="number" value={form.spouseCanadianWorkExperience} onChange={e => update("spouseCanadianWorkExperience", parseFloat(e.target.value) || 0)} min={0} max={10} step={0.5} className={inp} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {["speaking", "listening", "reading", "writing"].map(band => (
                    <div key={band}>
                      <label className={lbl + " capitalize"}>{band}</label>
                      <select value={form.spouseFirstLanguage[band as keyof typeof form.spouseFirstLanguage]} onChange={e => updateLang("spouseFirstLanguage", band, parseInt(e.target.value))} className={inp}>
                        {CLB.map(c => <option key={c} value={c}>{c === 0 ? "—" : c}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Additional */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Additional Points</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={lbl}>Canadian Education</label>
                <select value={form.canadianEducation} onChange={e => update("canadianEducation", e.target.value as any)} className={inp}>
                  <option value="none">None</option>
                  <option value="oneYear">1-2 year program (+15)</option>
                  <option value="twoYear">3+ year program (+30)</option>
                  <option value="phd">PhD (+30)</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Second Language (CLB)</label>
                <div className="grid grid-cols-2 gap-1">
                  {["speaking", "listening", "reading", "writing"].map(band => (
                    <select key={band} value={form.secondLanguage[band as keyof typeof form.secondLanguage]} onChange={e => updateLang("secondLanguage", band, parseInt(e.target.value))} className={inp}>
                      {CLB.map(c => <option key={c} value={c}>{band[0].toUpperCase()} {c}</option>)}
                    </select>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.provincialNomination} onChange={e => update("provincialNomination", e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-zinc-900" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Provincial Nomination (+600)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.frenchProficiency} onChange={e => update("frenchProficiency", e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-zinc-900" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">French NCLC 7+ & English CLB 5+ (+50)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.siblingInCanada} onChange={e => update("siblingInCanada", e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-zinc-900" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Sibling in Canada (+15)</span>
              </label>
            </div>
          </div>

          {/* Score + Submit */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Estimated CRS Score</p>
              <p className={`mt-1 text-5xl font-bold ${result.total >= 450 ? "text-green-600" : result.total >= 400 ? "text-amber-600" : "text-zinc-600"}`}>
                {result.total}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {result.total >= 450 ? "Competitive for most draws" :
                 result.total >= 400 ? "May be competitive with PNP" :
                 "Consider improving language or education"}
              </p>
            </div>
            <div className="mb-4 space-y-1 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-700">
              <Row label="Core (age, education, language, work)" value={result.core.total} />
              <Row label="Spouse" value={result.spouse.education + result.spouse.language + result.spouse.work} />
              <Row label="Skill transferability" value={result.skillTransferability.total} />
              <Row label="Additional points" value={result.additional.total} />
            </div>
            <button type="submit" disabled={sending || !form.firstName || !form.lastName || !form.email}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Saving..." : "Save My Score — We'll Contact You"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900 dark:text-zinc-50">{value}</span>
    </div>
  );
}
