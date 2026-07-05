"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/api/errors";
import { uploadFile, deleteFile, StorageBuckets, getStoragePath } from "@/lib/storage";
import {
  sanitizeFileName,
  getExtensionFromMimeType,
  isAllowedExtension,
  validateStoragePath,
} from "@/lib/document-naming";
import type { DocumentCategory as DocCatType } from "@/types";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp",
  "image/bmp", "image/tiff", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv", "application/zip", "application/x-rar-compressed",
]);

export async function uploadDocumentAction(
  file: File,
  category: DocCatType,
  caseId: string,
  notes: string | null,
  orgId: string,
): Promise<string> {
  const { prismaUser, organization } = await requireAuth();
  const supabase = getSupabaseAdmin();
  if (organization.id !== orgId) throw new AppError("FORBIDDEN", "Organization mismatch", 403);

  if (file.size === 0) throw new AppError("EMPTY_FILE", "File is empty", 400);
  if (file.size > MAX_FILE_SIZE) throw new AppError("FILE_TOO_LARGE", `File exceeds 25 MB limit`, 400);
  if (!ALLOWED_MIMES.has(file.type) && !isAllowedExtension(file.name)) {
    throw new AppError("INVALID_FILE_TYPE", `Unsupported file type: ${file.type || "unknown"}`, 400);
  }

  const { data: caseRecord, error: caseError } = await supabase
    .from("Case")
    .select("id, organizationId, clientId")
    .eq("id", caseId)
    .single();

  if (caseError || !caseRecord || caseRecord.organizationId !== organization.id) {
    throw new AppError("CASE_NOT_FOUND", "Case not found or access denied", 404);
  }

  const safeName = sanitizeFileName(file.name);
  const extension = getExtensionFromMimeType(file.type);
  const storageFileName = safeName.endsWith(extension) ? safeName : safeName + extension;

  const storagePath = getStoragePath({
    orgId: organization.id,
    entityType: "cases",
    entityId: caseId,
    category,
    fileName: storageFileName,
  });

  const pathCheck = validateStoragePath(storagePath);
  if (!pathCheck.valid) throw new AppError("INVALID_PATH", pathCheck.reason ?? "Invalid storage path", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { data: uploadResult, error: uploadError } = await uploadFile({
    bucket: StorageBuckets.CLIENT_DOCUMENTS,
    path: storagePath,
    file: buffer,
    contentType: file.type,
    upsert: false,
  });

  if (uploadError || !uploadResult) throw new AppError("UPLOAD_FAILED", uploadError ?? "Failed to upload file", 500);

  const { data: document, error: insertError } = await supabase
    .from("Document")
    .insert({
      caseId,
      clientId: caseRecord.clientId,
      uploadedById: prismaUser.id,
      name: file.name,
      storagePath: uploadResult.path,
      mimeType: file.type,
      sizeBytes: file.size,
      category,
      notes: notes || null,
    })
    .select()
    .single();

  if (insertError) throw new AppError("INSERT_FAILED", insertError.message, 500);

  const { error: logError } = await supabase
    .from("ActivityLog")
    .insert({
      organizationId: organization.id,
      userId: prismaUser.id,
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: document.id,
      metadata: { fileName: file.name, caseId, category, sizeBytes: file.size },
    });

  if (logError) console.warn("ActivityLog insert failed:", logError.message);

  return document.id;
}

export async function deleteDocumentAction(
  documentId: string,
  _orgId: string,
): Promise<boolean> {
  const { prismaUser, organization } = await requireAuth();
  const supabase = getSupabaseAdmin();

  if (organization.id !== _orgId) throw new AppError("FORBIDDEN", "Organization mismatch", 403);

  const { data: document, error } = await supabase
    .from("Document")
    .select("*, case:Case!inner(id, organizationId, title)")
    .eq("id", documentId)
    .single();

  if (error || !document) throw new AppError("NOT_FOUND", "Document not found", 404);

  const caseData = Array.isArray(document.case) ? document.case[0] : document.case;
  if (caseData.organizationId !== organization.id) throw new AppError("FORBIDDEN", "Access denied", 403);

  const { error: storageError } = await deleteFile(StorageBuckets.CLIENT_DOCUMENTS, document.storagePath);
  if (storageError) console.warn(`Storage delete warning for document ${documentId}: ${storageError}`);

  const { error: deleteError } = await supabase.from("Document").delete().eq("id", documentId);
  if (deleteError) throw new AppError("DELETE_FAILED", deleteError.message, 500);

  const { error: logError } = await supabase
    .from("ActivityLog")
    .insert({
      organizationId: organization.id,
      userId: prismaUser.id,
      action: "DOCUMENT_DELETED",
      entityType: "Document",
      entityId: documentId,
      metadata: { fileName: document.name, caseId: document.caseId, caseTitle: caseData.title },
    });

  if (logError) console.warn("ActivityLog insert failed:", logError.message);

  return true;
}
