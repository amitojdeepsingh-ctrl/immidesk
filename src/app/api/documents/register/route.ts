// ═══════════════════════════════════════════════════════════════════════════
// POST /api/documents/register
// ═══════════════════════════════════════════════════════════════════════════
// Auth: session required.
// Body: { caseId, path, fileName, sizeBytes, mimeType, category, notes? }
//
// Records a file that was uploaded straight to storage. The path must sit
// under this organization's prefix for this case.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";

const schema = z.object({
  caseId: z.string().min(1),
  path: z.string().min(1),
  fileName: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1),
  category: z.string().min(1),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("UNAUTHORIZED", "Sign in to continue", null, 401);
    const { organization, prismaUser } = user;

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", "Missing document details", null, 422);
    const { caseId, path, fileName, sizeBytes, mimeType, category, notes } = parsed.data;

    if (!path.startsWith(`${organization.id}/cases/${caseId}/`)) {
      return errorResponse("INVALID_PATH", "Upload path does not belong to this case", null, 422);
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

    const { data: doc, error } = await db
      .from("Document")
      .insert({
        caseId,
        clientId: kase.clientId,
        uploadedById: prismaUser.id,
        name: fileName,
        storagePath: path,
        mimeType,
        sizeBytes,
        category,
        notes: notes ?? null,
      })
      .select("id, name")
      .single();
    if (error || !doc) {
      return errorResponse("DB_ERROR", error?.message ?? "Could not save the document", null, 500);
    }

    return successResponse(doc, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
