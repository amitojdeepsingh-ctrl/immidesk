"use client";

import { useState } from "react";
import { Plus, Trash2, Send, CheckCircle2, Loader2 } from "lucide-react";

interface Child {
  name: string; dob: string; nationality: string;
}

export default function IntakeForm() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    dateOfBirth: "", gender: "", nationality: "", passportNumber: "",
    address: "", city: "", province: "", postalCode: "", country: "Canada",
    maritalStatus: "single",
    spouseFirstName: "", spouseLastName: "", spouseDOB: "", spouseNationality: "", spousePassport: "",
    occupation: "", educationLevel: "", englishLevel: "", frenchLevel: "",
    programType: "", currentStatus: "",
  });

  const [children, setChildren] = useState<Child[]>([]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const addChild = () => setChildren([...children, { name: "", dob: "", nationality: "" }]);
  const removeChild = (i: number) => setChildren(children.filter((_, idx) => idx !== i));
  const updateChild = (i: number, field: keyof Child) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = [...children];
    next[i] = { ...next[i], [field]: e.target.value };
    setChildren(next);
  };

  const sections = [
    { label: "Personal Information", fields: [
      { key: "firstName", label: "First Name", type: "text", required: true },
      { key: "lastName", label: "Last Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      { key: "gender", label: "Gender", type: "select", options: ["", "Male", "Female", "Other"] },
      { key: "nationality", label: "Nationality", type: "text" },
      { key: "passportNumber", label: "Passport Number", type: "text" },
    ]},
    { label: "Address", fields: [
      { key: "address", label: "Street Address", type: "text" },
      { key: "city", label: "City", type: "text" },
      { key: "province", label: "Province / State", type: "text" },
      { key: "postalCode", label: "Postal Code", type: "text" },
      { key: "country", label: "Country", type: "text" },
    ]},
    { label: "Family Information", fields: [
      { key: "maritalStatus", label: "Marital Status", type: "select", options: ["single", "married", "divorced", "widowed"] },
    ]},
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, childrenData: JSON.stringify(children) }),
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
          <h1 className="mt-4 text-lg font-semibold text-zinc-900">Application Submitted</h1>
          <p className="mt-2 text-sm text-zinc-500">Thank you! A consultant will review your information and contact you shortly.</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";
  const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Immigration Intake Form</h1>
          <p className="mt-1 text-sm text-zinc-500">Fill out this form and a consultant will follow up with you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {sections.map((section) => (
            <div key={section.label} className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{section.label}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.map((f) => (
                  <div key={f.key} className={f.key === "address" || f.key === "maritalStatus" ? "sm:col-span-2" : ""}>
                    <label className={labelClass}>{f.label}{f.required && <span className="text-red-500">*</span>}</label>
                    {f.type === "select" ? (
                      <select value={form[f.key as keyof typeof form] as string} onChange={update(f.key)} className={inputClass}>
                        {f.options?.map((o) => <option key={o} value={o}>{o || "Select..."}</option>)}
                      </select>
                    ) : (
                      <input type={f.type} value={form[f.key as keyof typeof form] as string} onChange={update(f.key)} required={f.required} className={inputClass} placeholder={f.label} />
                    )}
                  </div>
                ))}
              </div>

              {section.label === "Family Information" && form.maritalStatus === "married" && (
                <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-700">
                  <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Spouse Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[{ key: "spouseFirstName", label: "First Name" }, { key: "spouseLastName", label: "Last Name" }, { key: "spouseDOB", label: "Date of Birth", type: "date" }, { key: "spouseNationality", label: "Nationality" }, { key: "spousePassport", label: "Passport Number" }].map((f) => (
                      <div key={f.key}>
                        <label className={labelClass}>{f.label}</label>
                        <input type={(f as any).type || "text"} value={form[f.key as keyof typeof form] as string} onChange={update(f.key)} className={inputClass} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section.label === "Family Information" && (
                <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Children</h3>
                    <button type="button" onClick={addChild} className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                      <Plus className="h-3 w-3" /> Add Child
                    </button>
                  </div>
                  {children.length === 0 && <p className="mt-2 text-xs text-zinc-400">No children added.</p>}
                  {children.map((child, i) => (
                    <div key={i} className="relative mt-3 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
                      <button type="button" onClick={() => removeChild(i)} className="absolute right-2 top-2 text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      <p className="mb-3 text-xs font-medium text-amber-800 dark:text-amber-300">Child #{i + 1}</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div><label className={labelClass}>Name</label><input value={child.name} onChange={updateChild(i, "name")} className={inputClass} /></div>
                        <div><label className={labelClass}>DOB</label><input type="date" value={child.dob} onChange={updateChild(i, "dob")} className={inputClass} /></div>
                        <div><label className={labelClass}>Nationality</label><input value={child.nationality} onChange={updateChild(i, "nationality")} className={inputClass} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Education & Occupation */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Education & Occupation</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[{ key: "occupation", label: "Current Occupation" }, { key: "educationLevel", label: "Highest Education", options: ["", "High School", "Diploma", "Bachelor's", "Master's", "PhD"] }, { key: "englishLevel", label: "English Level", options: ["", "CLB 3 or less", "CLB 4", "CLB 5", "CLB 6", "CLB 7", "CLB 8", "CLB 9", "CLB 10+"], isSelect: true }, { key: "frenchLevel", label: "French Level", options: ["", "None", "NCLC 3 or less", "NCLC 4", "NCLC 5", "NCLC 6", "NCLC 7", "NCLC 8", "NCLC 9", "NCLC 10+"], isSelect: true }].map((f) => (
                <div key={f.key}>
                  <label className={labelClass}>{f.label}</label>
                  {f.isSelect ? (
                    <select value={form[f.key as keyof typeof form] as string} onChange={update(f.key)} className={inputClass}>
                      {(f.options as string[]).map((o: string) => <option key={o} value={o}>{o || "Select..."}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={form[f.key as keyof typeof form] as string} onChange={update(f.key)} className={inputClass} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Immigration Program */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Immigration Program</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Program Interested In</label>
                <select value={form.programType} onChange={update("programType")} className={inputClass}>
                  <option value="">Select...</option>
                  <option value="EXPRESS_ENTRY">Express Entry</option>
                  <option value="PNP">Provincial Nominee Program</option>
                  <option value="STUDY_PERMIT">Study Permit</option>
                  <option value="WORK_PERMIT">Work Permit</option>
                  <option value="SPOUSAL_SPONSORSHIP">Spousal Sponsorship</option>
                  <option value="BUSINESS_INVESTMENT">Business / Investment</option>
                  <option value="VISITOR_VISA">Visitor Visa</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Current Status</label>
                <select value={form.currentStatus} onChange={update("currentStatus")} className={inputClass}>
                  <option value="">Select...</option>
                  <option value="in-canada">Currently in Canada</option>
                  <option value="outside-canada">Outside Canada</option>
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
