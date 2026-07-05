// ═══════════════════════════════════════════════════════════════════════════
// ImmigDesk — UploadZone Component
// ═══════════════════════════════════════════════════════════════════════════
// Drag-and-drop file upload zone with category selection, case assignment,
// notes field, and upload progress tracking. Supports single or multi-file
// uploads with client-side validation (type, size).
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  Upload,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import {
  DocumentCategory,
  DocumentCategoryLabel,
} from "@/types";
import type { DocumentCategory as DocCatType } from "@/types";
import {
  isAllowedExtension,
  getAllowedExtensionsString,
  guessCategoryFromFileName,
} from "@/lib/document-naming";

// ─── Constants ─────────────────────────────────────────────────────────────

/** Max individual file size: 25 MB */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Allowed MIME types for upload */
const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-rar-compressed",
];

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CaseOption {
  id: string;
  title: string;
}

export interface UploadFile {
  /** Unique ID for tracking within the component */
  localId: string;
  file: File;
  category: DocCatType;
  caseId: string;
  notes: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number; // 0-100
  errorMessage?: string;
  /** Server-returned document ID after successful upload */
  documentId?: string;
}

interface UploadZoneProps {
  /** Available cases to assign documents to */
  cases: CaseOption[];
  /** Called when user initiates upload. Return the server document ID on success, or throw. */
  onUpload: (file: File, category: DocCatType, caseId: string, notes: string) => Promise<string>;
  /** Called after all uploads complete (or some fail) */
  onComplete?: (results: { succeeded: number; failed: number }) => void;
  /** Default case to pre-select (e.g. from URL context) */
  defaultCaseId?: string;
  /** Allow multiple files at once (default: true) */
  multiple?: boolean;
  /** Max total files per batch (default: 10) */
  maxFiles?: number;
  /** Custom accepted file types string for the input */
  accept?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

let localIdCounter = 0;
function nextLocalId(): string {
  return `upload-${Date.now()}-${++localIdCounter}`;
}

function validateFile(file: File): string | null {
  if (!ALLOWED_MIMES.includes(file.type) && !isAllowedExtension(file.name)) {
    return `Unsupported file type: ${file.type || "unknown"}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (${formatFileSize(file.size)}). Max ${formatFileSize(MAX_FILE_SIZE)}`;
  }
  if (file.size === 0) {
    return "File is empty";
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────

export function UploadZone({
  cases,
  onUpload,
  onComplete,
  defaultCaseId,
  multiple = true,
  maxFiles = 10,
  accept,
}: UploadZoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const defaultCategory: DocCatType = DocumentCategory.OTHER;
  const resolvedAccept =
    accept ?? getAllowedExtensionsString() + ",.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip";

  // ─── Add files to queue ───────────────────────────────────────────────

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const remaining = maxFiles - files.length;
      if (remaining <= 0) return;

      const toAdd = fileArray.slice(0, remaining);
      const entries: UploadFile[] = [];

      for (const file of toAdd) {
        const error = validateFile(file);
        const guessedCategory = guessCategoryFromFileName(file.name);
        entries.push({
          localId: nextLocalId(),
          file,
          category: guessedCategory ?? defaultCategory,
          caseId: defaultCaseId ?? cases[0]?.id ?? "",
          notes: "",
          status: error ? "error" : "pending",
          progress: 0,
          errorMessage: error ?? undefined,
        });
      }

      setFiles((prev) => [...prev, ...entries]);
    },
    [files.length, maxFiles, defaultCaseId, cases, defaultCategory],
  );

  // ─── Drag & drop handlers ─────────────────────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  // ─── Remove a file from queue ─────────────────────────────────────────

  const removeFile = useCallback((localId: string) => {
    setFiles((prev) => prev.filter((f) => f.localId !== localId));
  }, []);

  // ─── Update file metadata ─────────────────────────────────────────────

  const updateFile = useCallback(
    (localId: string, updates: Partial<Pick<UploadFile, "category" | "caseId" | "notes">>) => {
      setFiles((prev) =>
        prev.map((f) => (f.localId === localId ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  // ─── Upload all pending files ─────────────────────────────────────────

  const handleUploadAll = useCallback(async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    setUploading(true);
    let succeeded = 0;
    let failed = 0;

    // Upload sequentially to avoid overwhelming the server
    for (const item of pending) {
      // Mark as uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.localId === item.localId
            ? { ...f, status: "uploading" as const, progress: 10 }
            : f,
        ),
      );

      try {
        const documentId = await onUpload(
          item.file,
          item.category,
          item.caseId,
          item.notes,
        );

        setFiles((prev) =>
          prev.map((f) =>
            f.localId === item.localId
              ? {
                  ...f,
                  status: "done" as const,
                  progress: 100,
                  documentId,
                }
              : f,
          ),
        );
        succeeded++;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f) =>
            f.localId === item.localId
              ? {
                  ...f,
                  status: "error" as const,
                  progress: 0,
                  errorMessage: message,
                }
              : f,
          ),
        );
        failed++;
      }
    }

    setUploading(false);
    onComplete?.({ succeeded, failed });
  }, [files, onUpload, onComplete]);

  // ─── Clear completed/errored files ────────────────────────────────────

  const clearDone = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status === "pending"));
  }, []);

  // ─── Derived state ────────────────────────────────────────────────────

  const pendingCount = useMemo(
    () => files.filter((f) => f.status === "pending").length,
    [files],
  );
  const hasFiles = files.length > 0;
  const canUpload = pendingCount > 0 && !uploading;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
          isDragging
            ? "border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800"
            : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-900",
        )}
      >
        <Upload className="mb-3 h-8 w-8 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Drag & drop files here, or click to browse
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          PDF, images, Word, Excel, TXT, ZIP — up to {formatFileSize(MAX_FILE_SIZE)} each
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={resolvedAccept}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            // Reset so the same file can be re-selected
            e.target.value = "";
          }}
        />
      </div>

      {/* File queue */}
      {hasFiles && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {files.length} file{files.length !== 1 ? "s" : ""} queued
              {pendingCount > 0 && (
                <span className="ml-1 text-zinc-400">
                  ({pendingCount} pending)
                </span>
              )}
            </h4>
            <div className="flex items-center gap-2">
              {files.some((f) => f.status === "done" || f.status === "error") && (
                <button
                  onClick={clearDone}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Clear completed
                </button>
              )}
              <button
                onClick={handleUploadAll}
                disabled={!canUpload}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  canUpload
                    ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    : "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* File cards */}
          <div className="space-y-1.5">
            {files.map((item) => (
              <FileCard
                key={item.localId}
                item={item}
                cases={cases}
                onRemove={removeFile}
                onUpdate={updateFile}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── File Card Sub-component ───────────────────────────────────────────────

function FileCard({
  item,
  cases,
  onRemove,
  onUpdate,
}: {
  item: UploadFile;
  cases: CaseOption[];
  onRemove: (localId: string) => void;
  onUpdate: (
    localId: string,
    updates: Partial<Pick<UploadFile, "category" | "caseId" | "notes">>,
  ) => void;
}) {
  const isDone = item.status === "done";
  const isError = item.status === "error";
  const isUploading = item.status === "uploading";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
        isDone && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30",
        isError && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30",
        !isDone && !isError && "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
      )}
    >
      {/* File icon + name */}
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {item.file.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatFileSize(item.file.size)}
          </p>

          {/* Progress bar */}
          {isUploading && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-zinc-600 transition-all duration-300 dark:bg-zinc-400"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}

          {/* Error message */}
          {isError && item.errorMessage && (
            <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {item.errorMessage}
            </p>
          )}

          {/* Success */}
          {isDone && (
            <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Uploaded successfully
            </p>
          )}

          {/* Metadata fields (only for pending files) */}
          {item.status === "pending" && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Case selector */}
              <select
                value={item.caseId}
                onChange={(e) => onUpdate(item.localId, { caseId: e.target.value })}
                className="h-7 rounded border border-zinc-200 bg-white px-1.5 text-xs text-zinc-700 focus:border-zinc-300 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:focus:border-zinc-600"
              >
                <option value="">Select case…</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              {/* Category selector */}
              <select
                value={item.category}
                onChange={(e) =>
                  onUpdate(item.localId, {
                    category: e.target.value as DocCatType,
                  })
                }
                className="h-7 rounded border border-zinc-200 bg-white px-1.5 text-xs text-zinc-700 focus:border-zinc-300 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:focus:border-zinc-600"
              >
                {Object.entries(DocumentCategoryLabel).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Notes input */}
              <input
                type="text"
                placeholder="Add note…"
                value={item.notes}
                onChange={(e) =>
                  onUpdate(item.localId, { notes: e.target.value })
                }
                className="h-7 min-w-[120px] flex-1 rounded border border-zinc-200 bg-white px-2 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
              />
            </div>
          )}
        </div>
      </div>

      {/* Remove button */}
      {!isUploading && (
        <button
          onClick={() => onRemove(item.localId)}
          className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title="Remove"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
