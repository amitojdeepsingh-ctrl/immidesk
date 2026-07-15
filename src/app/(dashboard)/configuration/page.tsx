"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, GripVertical, FileText, GitBranch } from "lucide-react";

const CASE_TYPES = [
  "EXPRESS_ENTRY", "PNP", "STUDY_PERMIT", "WORK_PERMIT",
  "LMIA_BASED_WORK_PERMIT", "LMIA_EXEMPT_WORK_PERMIT", "VISITOR_VISA",
  "FAMILY_SPONSORSHIP", "SPOUSAL_SPONSORSHIP", "SPOUSAL_OWP", "SUPER_VISA",
  "TRP", "REFUGEE", "PRRA", "HC", "VULNERABLE_WORKER", "CITIZENSHIP",
  "BUSINESS_INVESTMENT", "RESTORATION_VISITOR", "OTHER",
];

const DOC_CATEGORIES = [
  "PASSPORT", "EDUCATION", "LANGUAGE_TEST", "WORK_EXPERIENCE", "FINANCIAL",
  "MEDICAL", "POLICE_CERTIFICATE", "PHOTO", "MARRIAGE_CERTIFICATE",
  "BIRTH_CERTIFICATE", "INSURANCE", "INVITATION", "IDENTITY", "WORK_PERMIT", "OTHER",
];

const DEFAULT_STAGES = [
  "Intake", "Retainer & Payment", "Eligibility Assessment", "Document Collection",
  "Application Prepared", "Submitted", "AOR / File Created", "Biometrics",
  "Medical Exam", "Additional Docs / ADR", "Eligibility Review", "Decision", "Closed",
];

const STAGE_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4",
  "#14B8A6", "#F97316", "#6366F1", "#EF4444", "#84CC16", "#22C55E", "#6B7280",
];

const DEFAULT_TEMPLATES: Record<string, { name: string; typeCode: string }[]> = {
  EXPRESS_ENTRY: [
    { name: "Passport", typeCode: "PASSPORT" },
    { name: "Language Test", typeCode: "LANGUAGE_TEST" },
    { name: "ECA", typeCode: "EDUCATION" },
    { name: "Employment Reference", typeCode: "WORK_EXPERIENCE" },
    { name: "Police Certificate", typeCode: "POLICE_CERTIFICATE" },
    { name: "Medical", typeCode: "MEDICAL" },
    { name: "Proof of Funds", typeCode: "FINANCIAL" },
    { name: "Photo", typeCode: "PHOTO" },
  ],
  STUDY_PERMIT: [
    { name: "Passport", typeCode: "PASSPORT" },
    { name: "Acceptance Letter", typeCode: "INVITATION" },
    { name: "Proof of Funds", typeCode: "FINANCIAL" },
    { name: "Police Certificate", typeCode: "POLICE_CERTIFICATE" },
    { name: "Medical", typeCode: "MEDICAL" },
    { name: "Study Plan", typeCode: "OTHER" },
    { name: "Ties to Home Country", typeCode: "OTHER" },
  ],
  WORK_PERMIT: [
    { name: "Passport", typeCode: "PASSPORT" },
    { name: "Job Offer / LMIA", typeCode: "WORK_PERMIT" },
    { name: "CV / Resume", typeCode: "WORK_EXPERIENCE" },
    { name: "Reference Letters", typeCode: "WORK_EXPERIENCE" },
    { name: "Police Certificate", typeCode: "POLICE_CERTIFICATE" },
    { name: "Qualifications", typeCode: "EDUCATION" },
  ],
  VISITOR_VISA: [
    { name: "Passport", typeCode: "PASSPORT" },
    { name: "Invitation Letter", typeCode: "INVITATION" },
    { name: "Travel Itinerary", typeCode: "OTHER" },
    { name: "Proof of Funds", typeCode: "FINANCIAL" },
    { name: "Ties to Home Country", typeCode: "OTHER" },
  ],
  FAMILY_SPONSORSHIP: [
    { name: "Passport", typeCode: "PASSPORT" },
    { name: "Birth / Marriage Certificate", typeCode: "BIRTH_CERTIFICATE" },
    { name: "Police Certificate", typeCode: "POLICE_CERTIFICATE" },
    { name: "Proof of Relationship", typeCode: "OTHER" },
    { name: "Sponsor Assessment", typeCode: "OTHER" },
  ],
};

type DocumentTemplate = {
  name: string;
  typeCode: string;
  required: boolean;
  order: number;
};

type CaseStage = {
  name: string;
  order: number;
  color: string;
};

function parseJsonField(val: unknown): unknown[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); }
    catch { return []; }
  }
  return [];
}

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "stages">("templates");

  const [selectedCaseType, setSelectedCaseType] = useState(CASE_TYPES[0]);
  const [documents, setDocuments] = useState<DocumentTemplate[]>([]);
  const [stages, setStages] = useState<CaseStage[]>([]);
  const [configExists, setConfigExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/case-types/config?caseType=${selectedCaseType}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const docs = parseJsonField(json.data.documentTemplates) as DocumentTemplate[];
          const sts = parseJsonField(json.data.caseStages) as CaseStage[];
          if (docs.length > 0) setDocuments(docs);
          if (sts.length > 0) setStages(sts);
          setConfigExists(true);
        }
      } else {
        seedDefaults();
        setConfigExists(false);
      }
    } catch {
      seedDefaults();
      setConfigExists(false);
    } finally {
      setLoading(false);
    }
  }, [selectedCaseType]);

  function seedDefaults() {
    const defaults = DEFAULT_TEMPLATES[selectedCaseType] ?? [
      { name: "Passport", typeCode: "PASSPORT" },
      { name: "Police Certificate", typeCode: "POLICE_CERTIFICATE" },
      { name: "Photo", typeCode: "PHOTO" },
      { name: "Proof of Funds", typeCode: "FINANCIAL" },
    ];
    setDocuments(defaults.map((d, i) => ({ ...d, required: true, order: i })));
    setStages(DEFAULT_STAGES.map((s, i) => ({ name: s, order: i, color: STAGE_COLORS[i] ?? "#6B7280" })));
    setConfigExists(false);
  }

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/case-types/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseType: selectedCaseType,
          documentTemplates: documents,
          caseStages: stages,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Configuration saved successfully" });
        setConfigExists(true);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error?.message ?? "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  function addDocument() {
    setDocuments(prev => [...prev, { name: "", typeCode: "OTHER", required: true, order: prev.length }]);
  }

  function removeDocument(idx: number) {
    setDocuments(prev => prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, order: i })));
  }

  function updateDocument(idx: number, field: keyof DocumentTemplate, value: string | boolean | number) {
    setDocuments(prev => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  }

  function addStage() {
    setStages(prev => [...prev, { name: "", order: prev.length, color: "#6B7280" }]);
  }

  function removeStage(idx: number) {
    setStages(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  }

  function updateStage(idx: number, field: keyof CaseStage, value: string) {
    setStages(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function moveStage(fromIdx: number, direction: "up" | "down") {
    const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= stages.length) return;
    setStages(prev => {
      const next = [...prev];
      const temp = { ...next[fromIdx], order: toIdx };
      next[fromIdx] = { ...next[toIdx], order: fromIdx };
      next[toIdx] = temp;
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Configuration</h1>
        <p className="text-sm text-zinc-500">Manage case type document templates and workflow stages</p>
      </div>

      <div className="flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "templates"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Document Templates
        </button>
        <button
          onClick={() => setActiveTab("stages")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "stages"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" /> Case Stages / Workflow
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Case Type</label>
        <select
          value={selectedCaseType}
          onChange={e => setSelectedCaseType(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {CASE_TYPES.map(ct => (
            <option key={ct} value={ct}>{ct.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-400">Loading...</p>
      ) : activeTab === "templates" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Document Templates</h2>
              <p className="text-xs text-zinc-500">Configure the document checklist for {selectedCaseType.replace(/_/g, " ")}</p>
            </div>
            {documents.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">No documents configured. Click &quot;Add Document&quot; to start.</p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <GripVertical className="h-4 w-4 shrink-0 text-zinc-300" />
                    <input
                      type="text"
                      value={doc.name}
                      onChange={e => updateDocument(i, "name", e.target.value)}
                      placeholder="Document name"
                      className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                    <select
                      value={doc.typeCode}
                      onChange={e => updateDocument(i, "typeCode", e.target.value)}
                      className="w-36 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    >
                      {DOC_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        checked={doc.required}
                        onChange={e => updateDocument(i, "required", e.target.checked)}
                        className="rounded border-zinc-300"
                      />
                      Required
                    </label>
                    <input
                      type="number"
                      value={doc.order}
                      onChange={e => updateDocument(i, "order", parseInt(e.target.value) || 0)}
                      className="w-14 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      min={0}
                    />
                    <button
                      onClick={() => removeDocument(i)}
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addDocument}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" /> Add Document
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
            </button>
            {message && (
              <span className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {message.text}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Case Stages / Workflow</h2>
              <p className="text-xs text-zinc-500">Define the workflow stages for {selectedCaseType.replace(/_/g, " ")}</p>
            </div>
            {stages.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">No stages configured. Click &quot;Add Stage&quot; to start.</p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {stages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveStage(i, "up")}
                        disabled={i === 0}
                        className="text-zinc-400 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button
                        onClick={() => moveStage(i, "down")}
                        disabled={i === stages.length - 1}
                        className="text-zinc-400 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: stage.color }}>
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={stage.name}
                      onChange={e => updateStage(i, "name", e.target.value)}
                      placeholder="Stage name"
                      className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                    <input
                      type="color"
                      value={stage.color}
                      onChange={e => updateStage(i, "color", e.target.value)}
                      className="h-7 w-10 cursor-pointer rounded border border-zinc-200 bg-white p-0.5 dark:border-zinc-700"
                    />
                    <button
                      onClick={() => removeStage(i)}
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addStage}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" /> Add Stage
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
            </button>
            {message && (
              <span className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {message.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
