import { nanoid } from "nanoid";
import type { DocumentCategory } from "@/types";
import { DocumentCategory as DocCat } from "@/types";

// ═══════════════════════════════════════════════════════════════════════════
// ImmigDesk — Document Naming Utilities
// ═══════════════════════════════════════════════════════════════════════════
// Sanitization, unique path generation, display names, and MIME helpers
// for the document storage system.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Constants ─────────────────────────────────────────────────────────────

/** Characters stripped from filenames for safety. */
const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/** Characters replaced with hyphens in filenames. */
const FILENAME_SEPARATOR_CHARS = /[\s_]+/g;

/** Max filename length before truncation (excluding extension). */
const MAX_FILENAME_LENGTH = 120;

/** Max total path length for Supabase Storage compatibility. */
const MAX_PATH_LENGTH = 512;

// ─── MIME Type ↔ Extension Maps ────────────────────────────────────────────

/**
 * Common MIME types to file extensions.
 * Covers all document types relevant to immigration casework.
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  // PDFs
  "application/pdf": ".pdf",

  // Images
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",

  // Word / Office
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",

  // Text
  "text/plain": ".txt",
  "text/csv": ".csv",

  // Archives
  "application/zip": ".zip",
  "application/x-rar-compressed": ".rar",
};

/**
 * File extension to MIME type (reverse lookup).
 */
export const EXTENSION_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
};

// ─── Category Display Labels ───────────────────────────────────────────────

export const DocumentCategoryLabel: Record<DocumentCategory, string> = {
  [DocCat.PASSPORT]: "Passport",
  [DocCat.EDUCATION]: "Education",
  [DocCat.LANGUAGE_TEST]: "Language Test",
  [DocCat.WORK_EXPERIENCE]: "Work Experience",
  [DocCat.FINANCIAL]: "Financial",
  [DocCat.MEDICAL]: "Medical",
  [DocCat.POLICE_CERTIFICATE]: "Police Certificate",
  [DocCat.PHOTO]: "Photo",
  [DocCat.MARRIAGE_CERTIFICATE]: "Marriage Certificate",
  [DocCat.BIRTH_CERTIFICATE]: "Birth Certificate",
  [DocCat.WORK_PERMIT]: "Work Permit",
  [DocCat.INSURANCE]: "Insurance",
  [DocCat.INVITATION]: "Invitation",
  [DocCat.IDENTITY]: "Identity",
  [DocCat.OTHER]: "Other",
};

// ─── Filename Sanitization ─────────────────────────────────────────────────

/**
 * Sanitize a user-provided filename for safe storage.
 *
 * Rules:
 * - Strips unsafe characters (< > : " / \ | ? * and control chars)
 * - Replaces whitespace and underscores with hyphens
 * - Collapses consecutive hyphens
 * - Trims leading/trailing hyphens and dots
 * - Lowercases the name portion (preserves extension casing)
 * - Truncates name portion to MAX_FILENAME_LENGTH
 * - Falls back to "document" if the result is empty
 */
export function sanitizeFileName(raw: string): string {
  // Split extension from base name
  const lastDot = raw.lastIndexOf(".");
  const hasExtension = lastDot > 0 && lastDot < raw.length - 1;

  let baseName: string;
  let extension: string;

  if (hasExtension) {
    baseName = raw.substring(0, lastDot);
    extension = raw.substring(lastDot); // includes the dot
  } else {
    baseName = raw;
    extension = "";
  }

  // Sanitize base name
  baseName = baseName
    .replace(UNSAFE_FILENAME_CHARS, "")
    .replace(FILENAME_SEPARATOR_CHARS, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();

  // Truncate if too long
  if (baseName.length > MAX_FILENAME_LENGTH) {
    baseName = baseName.substring(0, MAX_FILENAME_LENGTH).replace(/-+$/, "");
  }

  // Fallback
  if (baseName.length === 0) {
    baseName = "document";
  }

  return baseName + extension;
}

// ─── Unique Filename Generation ────────────────────────────────────────────

/**
 * Generate a unique storage filename by prepending a nanoid.
 *
 * Format: {nanoid}-{sanitizedBaseName}.{ext}
 * The nanoid prefix guarantees uniqueness even if the same document
 * is uploaded multiple times with the same original name.
 *
 * @param originalName - The user's original filename
 * @param idLength - nanoid length (default: 12, ~71 years to collision at 1000 IDs/hour)
 */
export function generateUniqueFileName(
  originalName: string,
  idLength = 12,
): string {
  const sanitized = sanitizeFileName(originalName);
  const lastDot = sanitized.lastIndexOf(".");
  const uniqueId = nanoid(idLength);

  if (lastDot > 0) {
    const base = sanitized.substring(0, lastDot);
    const ext = sanitized.substring(lastDot);
    return `${uniqueId}-${base}${ext}`;
  }

  return `${uniqueId}-${sanitized}`;
}

// ─── Storage Path Builders ─────────────────────────────────────────────────

interface DocumentPathParams {
  orgId: string;
  caseId: string;
  category: DocumentCategory;
  fileName: string;
}

/**
 * Build the full storage path for a case document.
 *
 * Convention: {orgId}/cases/{caseId}/{category}/{fileName}
 */
export function buildDocumentPath(params: DocumentPathParams): string {
  const { orgId, caseId, category, fileName } = params;
  const catSlug = category.toLowerCase().replace(/_/g, "-");
  return `${orgId}/cases/${caseId}/${catSlug}/${fileName}`;
}

/**
 * Build the storage path for a generated IMM form PDF.
 *
 * Convention: {orgId}/forms/{caseId}/{formCode}-{version}-filled.pdf
 */
export function buildFormPath(
  orgId: string,
  caseId: string,
  formCode: string,
  version: string,
): string {
  const safeCode = formCode.toLowerCase().replace(/\s+/g, "-");
  const safeVersion = version.toLowerCase().replace(/\s+/g, "-");
  return `${orgId}/forms/${caseId}/${safeCode}-v${safeVersion}-filled.pdf`;
}

/**
 * Build the storage path for an organization logo.
 *
 * Convention: {orgId}/logos/{fileName}
 */
export function buildLogoPath(orgId: string, fileName: string): string {
  return `${orgId}/logos/${fileName}`;
}

/**
 * Build the storage path for a compliance export.
 *
 * Convention: {orgId}/compliance/{exportType}-{date}.{ext}
 */
export function buildCompliancePath(
  orgId: string,
  exportType: string,
  date: Date,
  extension: string,
): string {
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const safeType = exportType.toLowerCase().replace(/\s+/g, "-");
  const safeExt = extension.startsWith(".") ? extension : `.${extension}`;
  return `${orgId}/compliance/${safeType}-${dateStr}${safeExt}`;
}

// ─── Display Name Generation ───────────────────────────────────────────────

/**
 * Generate a human-readable display name from a storage filename.
 *
 * Strips the nanoid prefix, converts hyphens back to spaces,
 * and applies title casing for UI display.
 *
 * Example: "a1b2c3d4e5f6-passport-singh.pdf" → "Passport Singh"
 */
export function getDisplayName(storageFileName: string): string {
  const sanitized = sanitizeFileName(storageFileName);
  const lastDot = sanitized.lastIndexOf(".");

  let baseName: string;
  if (lastDot > 0) {
    baseName = sanitized.substring(0, lastDot);
  } else {
    baseName = sanitized;
  }

  // Strip nanoid prefix (nanoid chars are [A-Za-z0-9_-])
  // A nanoid prefix looks like: {id}-{rest}
  const nanoidPattern = /^[A-Za-z0-9_-]{8,24}-/;
  baseName = baseName.replace(nanoidPattern, "");

  // Convert hyphens to spaces and title-case each word
  return baseName
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generate a display name that includes the category context.
 *
 * Example: "Passport — Amitoj Singh.pdf" or "IELTS Report — 2024.pdf"
 */
export function getDisplayNameWithCategory(
  storageFileName: string,
  category: DocumentCategory,
  clientName?: string,
): string {
  const baseDisplay = getDisplayName(storageFileName);
  const catLabel = DocumentCategoryLabel[category];

  if (clientName) {
    return `${catLabel} — ${clientName}`;
  }

  return `${catLabel} — ${baseDisplay}`;
}

// ─── Extension Helpers ─────────────────────────────────────────────────────

/**
 * Extract the file extension from a filename (including the dot).
 * Returns empty string if no extension is found.
 *
 * Examples:
 *   "passport.pdf" → ".pdf"
 *   "archive.tar.gz" → ".gz"
 *   "README" → ""
 */
export function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === fileName.length - 1) return "";
  return fileName.substring(lastDot).toLowerCase();
}

/**
 * Get the MIME type for a given file extension.
 * Returns "application/octet-stream" for unknown extensions.
 */
export function getMimeTypeFromExtension(extension: string): string {
  const normalized = extension.startsWith(".")
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;
  return EXTENSION_TO_MIME[normalized] ?? "application/octet-stream";
}

/**
 * Get the recommended file extension for a given MIME type.
 * Returns ".bin" for unknown MIME types.
 */
export function getExtensionFromMimeType(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] ?? ".bin";
}

/**
 * Check whether a filename has an allowed extension for document uploads.
 */
export function isAllowedExtension(fileName: string): boolean {
  const ext = getExtension(fileName);
  return ext !== "" && ext in EXTENSION_TO_MIME;
}

/**
 * List of all allowed upload extensions as a comma-separated string.
 * Useful for HTML accept attributes.
 */
export function getAllowedExtensionsString(): string {
  return Object.keys(EXTENSION_TO_MIME).join(",");
}

// ─── Path Validation ───────────────────────────────────────────────────────

/**
 * Validate that a full storage path does not exceed Supabase limits
 * and contains only safe characters.
 */
export function validateStoragePath(path: string): {
  valid: boolean;
  reason?: string;
} {
  if (path.length > MAX_PATH_LENGTH) {
    return {
      valid: false,
      reason: `Path exceeds ${MAX_PATH_LENGTH} characters (got ${path.length})`,
    };
  }

  if (path.includes("..")) {
    return { valid: false, reason: "Path contains directory traversal (..)" };
  }

  if (UNSAFE_FILENAME_CHARS.test(path)) {
    return { valid: false, reason: "Path contains unsafe characters" };
  }

  return { valid: true };
}

// ─── Category Detection Heuristics ─────────────────────────────────────────

/**
 * Attempt to detect the document category from the filename.
 * Uses keyword matching against common naming patterns.
 *
 * This is a best-effort heuristic — the user should always confirm.
 */
export function guessCategoryFromFileName(
  fileName: string,
): DocumentCategory | null {
  const lower = fileName.toLowerCase();

  if (/\b(passport|pp|travel\s*doc)\b/.test(lower)) return DocCat.PASSPORT;
  if (/\b(degree|diploma|transcript|marksheet|eca|wes|iqas|ices)\b/.test(lower))
    return DocCat.EDUCATION;
  if (/\b(ielts|celpip|tef|tcf|pte|language|english|french)\b/.test(lower))
    return DocCat.LANGUAGE_TEST;
  if (/\b(experience|reference\s*letter|employment|job|offer\s*letter|relieving)\b/.test(lower))
    return DocCat.WORK_EXPERIENCE;
  if (/\b(bank|fund|poe|proof\s*of\s*funds|gic|financial|statement|balance)\b/.test(lower))
    return DocCat.FINANCIAL;
  if (/\b(medical|ime|panel\s*physician|health|exam)\b/.test(lower))
    return DocCat.MEDICAL;
  if (/\b(pcc|police|criminal|background\s*check|clearance)\b/.test(lower))
    return DocCat.POLICE_CERTIFICATE;
  if (/\b(photo|photograph|picture|headshot|passport\s*size)\b/.test(lower))
    return DocCat.PHOTO;
  if (/\b(marriage|certificate|spouse|wedding|nikah)\b/.test(lower))
    return DocCat.MARRIAGE_CERTIFICATE;
  if (/\b(birth|certificate|dob)\b/.test(lower))
    return DocCat.BIRTH_CERTIFICATE;

  return null;
}
