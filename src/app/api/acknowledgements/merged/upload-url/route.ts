// ═══════════════════════════════════════════════════════════════════════════
// POST /api/acknowledgements/merged/upload-url
// ═══════════════════════════════════════════════════════════════════════════
// Auth: session required.
// Body: { clientId, caseId, fileName, sizeBytes }
//
// Returns a signed upload URL so the browser can send the merged PDF straight
// to storage. Server Actions cap request bodies at 1 MB, which merged PDFs
// routinely exceed, so the file never travels through the app server.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";
import { StorageBuckets, getStoragePath } from "@/lib/storage";
import { sanitizeFileName } from "@/lib/document-naming";

const MAX_BYTES = 25 * 1024 * 1024;

const schema = z.object({
  clientId: z.string().min(1),
  caseId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("UNAUTHORIZED", "Sign in to continue", null, 401);
    const { organization } = user;

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", "Missing upload details", null, 422);
    const { clientId, caseId, fileName, sizeBytes } = parsed.data;

    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return errorResponse("NOT_PDF", "The merged file must be a PDF", null, 422);
    }
    if (sizeBytes > MAX_BYTES) {
      return errorResponse("FILE_TOO_LARGE", "Merged PDFs are limited to 25 MB", null, 422);
    }

    const db = getSupabaseAdmin();

    const [{ data: client }, { data: kase }] = await Promise.all([
      db.from("Client").select("id, organizationId").eq("id", clientId).maybeSingle(),
      db.from("Case").select("id, clientId, organizationId").eq("id", caseId).maybeSingle(),
    ]);
    if (!client || client.organizationId !== organization.id) {
      return errorResponse("NOT_FOUND", "Client not found", null, 404);
    }
    if (!kase || kase.organizationId !== organization.id || kase.clientId !== clientId) {
      return errorResponse("NOT_FOUND", "Case not found", null, 404);
    }

    const safeName = sanitizeFileName(fileName);
    const storagePath = getStoragePath({
      orgId: organization.id,
      entityType: "cases",
      entityId: caseId,
      category: "OTHER",
      fileName: safeName,
    });

    const { data, error } = await db.storage
      .from(StorageBuckets.CLIENT_DOCUMENTS)
      .createSignedUploadUrl(storagePath, { upsert: true });
    if (error || !data) {
      return errorResponse("STORAGE_ERROR", error.message ?? "Could not prepare the upload", null, 500);
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
