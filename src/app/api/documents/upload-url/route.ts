// ═══════════════════════════════════════════════════════════════════════════
// POST /api/documents/upload-url
// ═══════════════════════════════════════════════════════════════════════════
// Auth: session required.
// Body: { caseId, fileName, sizeBytes }
//
// Signs a direct-to-storage upload for a client document. Server Actions cap
// bodies at 1 MB, which fails on real scans and merged PDFs.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";
import { StorageBuckets, getStoragePath } from "@/lib/storage";
import { sanitizeFileName, isAllowedExtension } from "@/lib/document-naming";

const MAX_BYTES = 25 * 1024 * 1024;

const schema = z.object({
  caseId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  category: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("UNAUTHORIZED", "Sign in to continue", null, 401);
    const { organization } = user;

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", "Missing upload details", null, 422);
    const { caseId, fileName, sizeBytes, category } = parsed.data;

    if (sizeBytes > MAX_BYTES) {
      return errorResponse("FILE_TOO_LARGE", "Files are limited to 25 MB", null, 422);
    }
    if (!isAllowedExtension(fileName)) {
      return errorResponse("INVALID_FILE_TYPE", "That file type is not accepted", null, 422);
    }

    const db = getSupabaseAdmin();
    const { data: kase } = await db
      .from("Case")
      .select("id, clientId, organizationId")
      .eq("id", caseId)
      .maybeSingle();
    if (!kase || kase.organizationId !== organization.id) {
      return errorResponse("NOT_FOUND", "Case not found", null, 404);
    }

    const safeName = sanitizeFileName(fileName);
    const storagePath = getStoragePath({
      orgId: organization.id,
      entityType: "cases",
      entityId: caseId,
      category: category ?? "OTHER",
      fileName: safeName,
    });

    const { data, error } = await db.storage
      .from(StorageBuckets.CLIENT_DOCUMENTS)
      .createSignedUploadUrl(storagePath, { upsert: true });
    if (error || !data) {
      return errorResponse("STORAGE_ERROR", error?.message ?? "Could not prepare the upload", null, 500);
    }

    return successResponse({
      bucket: StorageBuckets.CLIENT_DOCUMENTS,
      path: storagePath,
      token: data.token,
      fileName: safeName,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
