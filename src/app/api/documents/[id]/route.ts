import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
  AppError,
} from "@/lib/api/errors";
import {
  getPresignedDownloadUrl,
  deleteFile,
  StorageBuckets,
} from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organization } = await requireAuth();
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: document, error } = await supabase
      .from("Document")
      .select("*, case:Case!inner(id, organizationId, title, client:Client!inner(firstName, lastName)), uploadedBy:User!inner(name)")
      .eq("id", id)
      .single();

    if (error || !document) {
      throw new AppError("NOT_FOUND", "Document not found", 404);
    }

    const caseData = Array.isArray(document.case) ? document.case[0] : document.case;
    if (caseData.organizationId !== organization.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    const { data: urlData, error: urlError } = await getPresignedDownloadUrl({
      bucket: StorageBuckets.CLIENT_DOCUMENTS,
      path: document.storagePath,
      expiresIn: 300,
    });

    if (urlError || !urlData) {
      throw new AppError("URL_GENERATION_FAILED", urlError ?? "Failed to generate download URL", 500);
    }

    const uploadedBy = Array.isArray(document.uploadedBy) ? document.uploadedBy[0] : document.uploadedBy;
    const client = Array.isArray(caseData.client) ? caseData.client[0] : caseData.client;

    return successResponse({
      ...document,
      downloadUrl: urlData.signedUrl,
      caseTitle: caseData.title,
      clientName: `${client.firstName} ${client.lastName}`,
      uploadedByName: uploadedBy.name,
    }, 200);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: document, error } = await supabase
      .from("Document")
      .select("*, case:Case!inner(id, organizationId, title)")
      .eq("id", id)
      .single();

    if (error || !document) {
      throw new AppError("NOT_FOUND", "Document not found", 404);
    }

    const caseData = Array.isArray(document.case) ? document.case[0] : document.case;
    if (caseData.organizationId !== organization.id) {
      throw new AppError("FORBIDDEN", "Access denied", 403);
    }

    const { error: storageError } = await deleteFile(StorageBuckets.CLIENT_DOCUMENTS, document.storagePath);
    if (storageError) console.warn(`Storage delete warning for document ${id}: ${storageError}`);

    const { error: deleteError } = await supabase.from("Document").delete().eq("id", id);
    if (deleteError) throw new AppError("DELETE_FAILED", deleteError.message, 500);

    const { error: logError } = await supabase
      .from("ActivityLog")
      .insert({
        organizationId: organization.id,
        userId: prismaUser.id,
        action: "DOCUMENT_DELETED",
        entityType: "Document",
        entityId: id,
        metadata: { fileName: document.name, caseId: document.caseId, caseTitle: caseData.title },
      });

    if (logError) console.warn("ActivityLog insert failed:", logError.message);

    return successResponse({ deleted: true, id }, 200);
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
