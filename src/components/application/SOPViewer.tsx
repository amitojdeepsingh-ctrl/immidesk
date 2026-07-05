"use client";

import { useState, useCallback } from "react";
import { FileText, Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// SOPViewer — SOP generation & display component
// ============================================================================
// Fetches SOP text from the API, displays it in a scrollable container,
// and provides copy-to-clipboard functionality.
// ============================================================================

interface SOPViewerProps {
  caseId: string;
  existingSop?: string;
}

export function SOPViewer({ caseId, existingSop }: SOPViewerProps) {
  const [sopText, setSopText] = useState<string | null>(existingSop ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sop/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message ?? "Failed to generate SOP");
        setIsLoading(false);
        return;
      }

      setSopText(json.data.sop);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsLoading(false);
    }
  }, [caseId, isLoading]);

  const handleCopy = useCallback(async () => {
    if (!sopText) return;

    try {
      await navigator.clipboard.writeText(sopText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = sopText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [sopText]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {sopText ? "Generated SOP" : "No SOP generated yet"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sopText && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            {isLoading ? "Generating..." : "Generate SOP"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {sopText ? (
          <div className="relative">
            <div
              className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-4 font-mono text-xs leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              style={{ tabSize: 2 }}
            >
              {sopText}
            </div>
            <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
              {sopText.split(/\s+/).length} words
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isLoading
                ? "Generating your SOP..."
                : 'Click "Generate SOP" to create an AI-powered Statement of Purpose'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
