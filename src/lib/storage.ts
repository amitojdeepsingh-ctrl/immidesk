import { createClient as createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PlanTier, DocumentCategory } from "@/types";

// ═══════════════════════════════════════════════════════════════════════════
// ImmigDesk — Supabase Storage Helpers
// ═══════════════════════════════════════════════════════════════════════════
// Centralized storage operations for all 4 buckets. Path convention:
//   {orgId}/{entityType}/{entityId}/{category}/{filename}
// ═══════════════════════════════════════════════════════════════════════════

// ─── Bucket Constants ──────────────────────────────────────────────────────

export const StorageBuckets = {
  CLIENT_DOCUMENTS: "client-documents",
  GENERATED_FORMS: "generated-forms",
  ORGANIZATION_LOGOS: "organization-logos",
  COMPLIANCE_EXPORTS: "compliance-exports",
} as const;

export type StorageBucket =
  (typeof StorageBuckets)[keyof typeof StorageBuckets];

// ─── Plan Storage Limits (bytes) ───────────────────────────────────────────

export const PLAN_STORAGE_LIMITS: Record<PlanTier, number> = {
  SOLO: 5 * 1024 * 1024 * 1024, // 5 GB
  TEAM: 15 * 1024 * 1024 * 1024, // 15 GB
  FIRM: 50 * 1024 * 1024 * 1024, // 50 GB
  ENTERPRISE: 100 * 1024 * 1024 * 1024, // 100 GB
};

// ─── Path Generation ───────────────────────────────────────────────────────

interface StoragePathParams {
  orgId: string;
  entityType: "clients" | "cases" | "forms" | "logos" | "compliance";
  entityId: string;
  category: DocumentCategory | string;
  fileName: string;
}

/**
 * Build a storage path following the ImmigDesk convention:
 *   {orgId}/{entityType}/{entityId}/{category}/{fileName}
 *
 * Automatically lowercases and sanitizes segment separators.
 */
export function getStoragePath(params: StoragePathParams): string {
  const { orgId, entityType, entityId, category, fileName } = params;
  // DocumentCategory values are string literals, so .toLowerCase() works on both branches
  const safeCategory = String(category).toLowerCase().replace(/\s+/g, "-");
  return `${orgId}/${entityType}/${entityId}/${safeCategory}/${fileName}`;
}

/**
 * Parse a storage path back into its constituent parts.
 * Returns null if the path does not match the expected convention.
 */
export function parseStoragePath(
  path: string,
): StoragePathParams | null {
  const parts = path.split("/");
  if (parts.length < 5) return null;
  return {
    orgId: parts[0],
    entityType: parts[1] as StoragePathParams["entityType"],
    entityId: parts[2],
    category: parts[3],
    fileName: parts.slice(4).join("/"), // handle filenames with subfolders
  };
}

// ─── Upload ────────────────────────────────────────────────────────────────

interface UploadOptions {
  bucket: StorageBucket;
  path: string;
  file: Buffer | Blob | File;
  contentType?: string;
  upsert?: boolean;
}

interface UploadResult {
  path: string;
  fullPath: string;
}

/**
 * Upload a file to a Supabase storage bucket.
 * Uses the server client (anon key) — RLS policies enforce org-level access.
 *
 * For browser-side uploads, prefer getPresignedUploadUrl() to avoid
 * sending the file through the Next.js server.
 */
export async function uploadFile(
  opts: UploadOptions,
): Promise<{ data: UploadResult | null; error: string | null }> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.storage
    .from(opts.bucket)
    .upload(opts.path, opts.file, {
      contentType: opts.contentType,
      upsert: opts.upsert ?? false,
    });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: { path: data.path, fullPath: data.fullPath },
    error: null,
  };
}

/**
 * Upload a file using the service-role admin client, bypassing RLS.
 * Use this for server-side uploads where no user session exists
 * (e.g. client portal uploads authenticated by a signed token).
 */
export async function uploadFileAdmin(
  opts: UploadOptions,
): Promise<{ data: UploadResult | null; error: string | null }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from(opts.bucket)
    .upload(opts.path, opts.file, {
      contentType: opts.contentType,
      upsert: opts.upsert ?? false,
    });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: { path: data.path, fullPath: data.fullPath },
    error: null,
  };
}

// ─── Presigned Upload URL (browser-direct upload) ──────────────────────────

interface PresignedUploadOptions {
  bucket: StorageBucket;
  path: string;
  /** Whether to overwrite an existing file at the same path */
  upsert?: boolean;
}

interface PresignedUploadResult {
  signedUrl: string;
  path: string;
  token: string;
}

/**
 * Generate a presigned upload URL so the browser can upload directly
 * to Supabase Storage without proxying through the Next.js server.
 *
 * This is the preferred upload path for client-side file uploads.
 * Combine with RLS policies to enforce org-level access.
 *
 * Note: Supabase signed upload URLs have a fixed expiry (typically 300s).
 * The upsert flag controls whether an existing file at the path is overwritten.
 */
export async function getPresignedUploadUrl(
  opts: PresignedUploadOptions,
): Promise<{ data: PresignedUploadResult | null; error: string | null }> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.storage
    .from(opts.bucket)
    .createSignedUploadUrl(opts.path, {
      upsert: opts.upsert ?? false,
    });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    },
    error: null,
  };
}

// ─── Download / Signed URL ─────────────────────────────────────────────────

interface PresignedDownloadOptions {
  bucket: StorageBucket;
  path: string;
  /** Number of seconds until the signed URL expires (default: 3600 = 1 hour) */
  expiresIn?: number;
  /** Force download with Content-Disposition: attachment */
  download?: boolean;
}

/**
 * Generate a presigned download URL for a stored file.
 * Useful for serving private documents without exposing the bucket publicly.
 */
export async function getPresignedDownloadUrl(
  opts: PresignedDownloadOptions,
): Promise<{ data: { signedUrl: string } | null; error: string | null }> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.storage
    .from(opts.bucket)
    .createSignedUrl(opts.path, opts.expiresIn ?? 3600, {
      download: opts.download ?? false,
    });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: { signedUrl: data.signedUrl },
    error: null,
  };
}

/**
 * Get a public URL for a file in a public bucket.
 * Only works if the bucket has public access enabled.
 */
export function getPublicUrl(
  bucket: StorageBucket,
  path: string,
): string {
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"]!;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

// ─── Delete ────────────────────────────────────────────────────────────────

/**
 * Delete a single file from a storage bucket.
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string,
): Promise<{ error: string | null }> {
  const supabase = await createServerClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Delete multiple files from a storage bucket in a single operation.
 */
export async function deleteFiles(
  bucket: StorageBucket,
  paths: string[],
): Promise<{ error: string | null }> {
  const supabase = await createServerClient();

  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// ─── List / Search ─────────────────────────────────────────────────────────

interface ListFilesOptions {
  bucket: StorageBucket;
  /** Prefix path to filter by (e.g. "{orgId}/cases/{caseId}/") */
  prefix?: string;
  limit?: number;
  offset?: number;
  sortBy?: { column: string; order: "asc" | "desc" };
}

interface FileInfo {
  name: string;
  id: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  lastAccessedAt: string | null;
  size: number | null;
  metadata: Record<string, unknown> | null;
}

/**
 * List files in a bucket, optionally filtered by prefix.
 */
export async function listFiles(
  opts: ListFilesOptions,
): Promise<{ data: FileInfo[] | null; error: string | null }> {
  const supabase = await createServerClient();

  const query = supabase.storage.from(opts.bucket).list(opts.prefix ?? "", {
    limit: opts.limit ?? 100,
    offset: opts.offset ?? 0,
    sortBy: opts.sortBy ?? { column: "name", order: "asc" },
  });

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: data?.map((f) => ({
      name: f.name,
      id: f.id ?? null,
      updatedAt: f.updated_at ?? null,
      createdAt: f.created_at ?? null,
      lastAccessedAt: f.last_accessed_at ?? null,
      size: f.metadata?.size ?? null,
      metadata: f.metadata ?? null,
    })) ?? null,
    error: null,
  };
}

// ─── Storage Usage ─────────────────────────────────────────────────────────

/**
 * Calculate total storage used by an organization across all buckets.
 * Uses the admin client (service_role) to bypass RLS and scan all objects.
 *
 * Note: Supabase Storage list() returns max 1000 items per call.
 * For orgs exceeding that, pagination is handled automatically.
 */
export async function getOrgStorageUsed(
  orgId: string,
): Promise<number> {
  const supabase = await createAdminClient();
  let totalBytes = 0;

  for (const bucket of Object.values(StorageBuckets)) {
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(orgId, { limit, offset, sortBy: { column: "name", order: "asc" } });

      if (error || !data) {
        hasMore = false;
        continue;
      }

      for (const file of data) {
        const size = file.metadata?.size;
        if (typeof size === "number") {
          totalBytes += size;
        }
      }

      if (data.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }
  }

  return totalBytes;
}

/**
 * Check whether an organization has enough storage remaining for a new upload.
 * Returns the remaining bytes and whether the upload is allowed.
 */
export async function checkStorageLimit(
  orgId: string,
  planTier: PlanTier,
  newFileSizeBytes: number,
): Promise<{
  allowed: boolean;
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
}> {
  const limitBytes = PLAN_STORAGE_LIMITS[planTier];
  const usedBytes = await getOrgStorageUsed(orgId);
  const remainingBytes = limitBytes - usedBytes;

  return {
    allowed: remainingBytes >= newFileSizeBytes,
    usedBytes,
    limitBytes,
    remainingBytes,
  };
}

// ─── Move / Copy ───────────────────────────────────────────────────────────

/**
 * Move a file from one path to another within the same bucket.
 */
export async function moveFile(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string,
): Promise<{ error: string | null }> {
  const supabase = await createServerClient();

  const { error } = await supabase.storage
    .from(bucket)
    .move(fromPath, toPath);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Copy a file to a new path within the same bucket.
 */
export async function copyFile(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string,
): Promise<{ error: string | null }> {
  const supabase = await createServerClient();

  const { error } = await supabase.storage
    .from(bucket)
    .copy(fromPath, toPath);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// ─── Bulk Operations ───────────────────────────────────────────────────────

/**
 * Delete all files under a given prefix (e.g. all documents for a case).
 * Lists files first, then deletes them in one call.
 */
export async function deleteByPrefix(
  bucket: StorageBucket,
  prefix: string,
): Promise<{ deletedCount: number; error: string | null }> {
  const supabase = await createServerClient();

  // Collect all files under the prefix
  const paths: string[] = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset });

    if (error || !data) {
      return { deletedCount: paths.length, error: error?.message ?? null };
    }

    for (const file of data) {
      paths.push(`${prefix}/${file.name}`);
    }

    if (data.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  if (paths.length === 0) {
    return { deletedCount: 0, error: null };
  }

  const { error } = await supabase.storage.from(bucket).remove(paths);

  return {
    deletedCount: error ? 0 : paths.length,
    error: error?.message ?? null,
  };
}

// ─── File Existence ────────────────────────────────────────────────────────

/**
 * Check whether a file exists at the given path.
 */
export async function fileExists(
  bucket: StorageBucket,
  path: string,
): Promise<boolean> {
  const supabase = await createServerClient();

  // list() with a precise prefix and limit=1 is the most efficient check
  const dir = path.substring(0, path.lastIndexOf("/"));
  const fileName = path.substring(path.lastIndexOf("/") + 1);

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(dir, { limit: 500, search: fileName });

  if (error || !data) return false;

  return data.some((f) => f.name === fileName);
}
