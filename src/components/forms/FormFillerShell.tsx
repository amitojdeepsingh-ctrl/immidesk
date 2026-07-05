"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FormFillerFieldList, type FormField, type PrefillData } from "./FormFillerFieldList";
import { FormFillerPdfPreview } from "./FormFillerPdfPreview";
import { CheckCircle, ArrowLeft, Save, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface FormFillerShellProps {
  formCode: string;
  formName: string;
  formVersion: string;
  templateId: string;
  fields: FormField[];
  initialData: PrefillData;
  clientId?: string;
  caseId?: string;
  submissionId?: string;
  clientName?: string;
}

export function FormFillerShell({
  formCode,
  formName,
  formVersion,
  templateId,
  fields,
  initialData,
  clientId,
  caseId,
  submissionId: initialSubmissionId,
  clientName,
}: FormFillerShellProps) {
  const [prefilledData, setPrefilledData] = useState<PrefillData>(initialData);
  const [submissionId, setSubmissionId] = useState<string | undefined>(initialSubmissionId);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);

  const handleFieldUpdate = useCallback(
    (key: string, value: string | number | boolean | null) => {
      setPrefilledData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = async () => {
    if (!submissionId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/forms/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filledData: prefilledData }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrefill = async () => {
    if (!clientId) return;
    setIsPrefilling(true);
    try {
      const res = await fetch("/api/forms/prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, clientId }),
      });
      const result = await res.json();
      if (result.data?.prefilledData) {
        setPrefilledData(result.data.prefilledData);
          if (caseId && !submissionId) {
            const saveRes = await fetch("/api/forms/fill", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                templateId,
                caseId,
                clientId,
                filledData: result.data.prefilledData,
              }),
            });
            const saveResult = await saveRes.json();
            if (saveResult.data?.submissionId) {
              setSubmissionId(saveResult.data.submissionId);
              window.history.replaceState(null, "", `/forms/${formCode}?clientId=${clientId}&caseId=${caseId}`);
            }
          }
      }
    } catch (err) {
      console.error("Prefill error:", err);
    } finally {
      setIsPrefilling(false);
    }
  };

  const router = useRouter();

  const handleMarkComplete = async () => {
    if (!submissionId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/forms/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filledData: prefilledData, status: "COMPLETE" }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push(backHref);
    } catch (err) {
      console.error("Mark complete error:", err);
      alert("Failed to mark complete: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const filledCount = fields.filter(
    (f) => prefilledData[f.key] !== null && prefilledData[f.key] !== undefined && prefilledData[f.key] !== "",
  ).length;
  const progress = fields.length > 0 ? Math.round((filledCount / fields.length) * 100) : 0;

  const backHref = clientId ? `/clients/${clientId}/application` : "/forms";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {formName}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {formCode} &middot; v{formVersion}
                {clientName && <> &middot; {clientName}</>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {clientId && (
              <button
                onClick={handlePrefill}
                disabled={isPrefilling}
                className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {isPrefilling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isPrefilling ? "Running AI..." : "AI Auto-Fill"}
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    progress === 100 ? "bg-green-500" : "bg-blue-500",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {filledCount}/{fields.length}
              </span>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save Draft"}
            </button>

            <button
              onClick={handleMarkComplete}
              disabled={isSaving || filledCount === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Mark Complete
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 overflow-hidden border-r border-zinc-200 dark:border-zinc-800">
          <FormFillerFieldList
            fields={fields}
            prefilledData={prefilledData}
            onFieldUpdate={handleFieldUpdate}
          />
        </div>
        <div className="w-1/2 overflow-hidden">
          <FormFillerPdfPreview
            formName={formName}
            formCode={formCode}
            fields={fields}
            prefilledData={prefilledData}
            clientName={clientName}
          />
        </div>
      </div>
    </div>
  );
}


