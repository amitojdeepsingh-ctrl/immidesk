// ═══════════════════════════════════════════════════════════════════════════
// ImmigDesk — DocumentList Component
// ═══════════════════════════════════════════════════════════════════════════
// Displays a filterable, sortable table of documents for a client or case.
// Supports download (presigned URL), delete, and category filtering.
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { useState, useCallback } from "react";
import {
  FileText,
  Download,
  Trash2,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Loader2,
  FileArchive,
  FileImage,
  File,
} from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/utils";
import { DocumentCategory, DocumentCategoryLabel } from "@/types";
import type { DocumentCategory as DocCatType } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DocumentItem {
  id: string;
  name: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  category: DocCatType;
  notes: string | null;
  createdAt: string;
  caseTitle?: string;
  caseId?: string;
  uploadedByName?: string;
  downloadUrl?: string;
}

interface DocumentListProps {
  documents: DocumentItem[];
  /** Called when user clicks download. If omitted, uses downloadUrl directly. */
  onDownload?: (doc: DocumentItem) => void;
  /** Called when user confirms delete. Return false to abort. */
  onDelete?: (doc: DocumentItem) => Promise<boolean>;
  /** Show case column (default: true when any doc has caseTitle) */
  showCase?: boolean;
  /** Show uploader column */
  showUploader?: boolean;
  /** Allow delete action (default: true) */
  allowDelete?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
}

// ─── Sort & Filter ─────────────────────────────────────────────────────────

type SortField = "name" | "category" | "sizeBytes" | "createdAt";
type SortDir = "asc" | "desc";

const CATEGORY_OPTIONS: (DocCatType | "ALL")[] = [
  "ALL",
  ...(Object.keys(DocumentCategory) as DocCatType[]),
];

// ─── SortIcon component (moved outside to avoid react-hooks/static-components)
function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return null;
  return sortDir === "asc" ? (
    <ChevronUp className="ml-1 h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 h-3 w-3" />
  );
}

// ─── MIME icon helper ──────────────────────────────────────────────────────

function getMimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("archive")
  )
    return FileArchive;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return FileText;
  return File;
}

// ─── Component ────────────────────────────────────────────────────────────

export function DocumentList({
  documents,
  onDownload,
  onDelete,
  showCase,
  showUploader = false,
  allowDelete = true,
  emptyMessage = "No documents uploaded yet",
}: DocumentListProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DocCatType | "ALL">(
    "ALL",
  );
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasCaseData =
    showCase ?? documents.some((d) => d.caseTitle);

  // ─── Filter & sort ────────────────────────────────────────────────────

  const filtered = documents
    .filter((d) => {
      if (categoryFilter !== "ALL" && d.category !== categoryFilter) return false;
      if (search.trim()) {
        const term = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(term) ||
          (d.notes?.toLowerCase().includes(term) ?? false) ||
          (d.caseTitle?.toLowerCase().includes(term) ?? false)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "name") return dir * a.name.localeCompare(b.name);
      if (sortField === "category")
        return dir * a.category.localeCompare(b.category);
      if (sortField === "sizeBytes") return dir * (a.sizeBytes - b.sizeBytes);
      return (
        dir *
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      );
    });

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField],
  );

  const handleDelete = useCallback(
    async (doc: DocumentItem) => {
      if (!onDelete) return;
      setDeletingId(doc.id);
      try {
        await onDelete(doc);
      } finally {
        setDeletingId(null);
      }
    },
    [onDelete],
  );

  const handleDownload = useCallback(
    (doc: DocumentItem) => {
      if (onDownload) {
        onDownload(doc);
      } else if (doc.downloadUrl) {
        window.open(doc.downloadUrl, "_blank");
      }
    },
    [onDownload],
  );

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-zinc-400" />
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as DocCatType | "ALL")
            }
            className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
          >
            <option value="ALL">All Categories</option>
            {CATEGORY_OPTIONS.filter((c) => c !== "ALL").map((cat) => (
              <option key={cat} value={cat}>
                {DocumentCategoryLabel[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Count */}
        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          {filtered.length} of {documents.length} document
          {documents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 py-12 text-center dark:border-zinc-700">
          <FileText className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {documents.length === 0 ? emptyMessage : "No documents match your filters"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50">
                <Th
                  label="Name"
                  field="name"
                  onSort={handleSort}
                  sortIcon={<SortIcon field="name" sortField={sortField} sortDir={sortDir} />}
                />
                <Th
                  label="Category"
                  field="category"
                  onSort={handleSort}
                  sortIcon={<SortIcon field="category" sortField={sortField} sortDir={sortDir} />}
                />
                {hasCaseData && (
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Case
                  </th>
                )}
                {showUploader && (
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Uploaded by
                  </th>
                )}
                <Th
                  label="Size"
                  field="sizeBytes"
                  onSort={handleSort}
                  sortIcon={<SortIcon field="sizeBytes" sortField={sortField} sortDir={sortDir} />}
                />
                <Th
                  label="Date"
                  field="createdAt"
                  onSort={handleSort}
                  sortIcon={<SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />}
                />
                <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((doc) => {
                const MimeIcon = getMimeIcon(doc.mimeType);
                return (
                  <tr
                    key={doc.id}
                    className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/70"
                  >
                    {/* Name */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <MimeIcon className="h-4 w-4 shrink-0 text-zinc-400" />
                        <span className="truncate max-w-[220px] font-medium text-zinc-900 dark:text-zinc-100">
                          {doc.name}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {DocumentCategoryLabel[doc.category]}
                      </span>
                    </td>

                    {/* Case */}
                    {hasCaseData && (
                      <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                        {doc.caseTitle ?? "—"}
                      </td>
                    )}

                    {/* Uploader */}
                    {showUploader && (
                      <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                        {doc.uploadedByName ?? "—"}
                      </td>
                    )}

                    {/* Size */}
                    <td className="px-4 py-2.5 tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(doc.sizeBytes)}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-2.5 tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatDate(doc.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {allowDelete && (
                          <button
                            onClick={() => handleDelete(doc)}
                            disabled={deletingId === doc.id}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sortable table header ─────────────────────────────────────────────────

function Th({
  label,
  field,
  onSort,
  sortIcon,
}: {
  label: string;
  field: SortField;
  onSort: (field: SortField) => void;
  sortIcon: React.ReactNode;
}) {
  return (
    <th className="px-4 py-2.5 text-left">
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        {label}
        {sortIcon}
      </button>
    </th>
  );
}
