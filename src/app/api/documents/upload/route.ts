import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
  AppError,
} from "@/lib/api/errors";
import { uploadFile, StorageBuckets, getStoragePath } from "@/lib/storage";
import {
  sanitizeFileName,
  getExtensionFromMimeType,
  isAllowedExtension,
  validateStoragePath,
} from "@/lib/document-naming";
import { DocumentCategory } from "@/types";
import type { DocumentCategory as DocCatType } from "@/types";
import { z } from "zod";

const uploadMetadataSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  category: z.nativeEnum(DocumentCategory).optional().default(DocumentCategory.OTHER),
  notes: z.string().max(1000).optional().default(""),
});

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp",
  "image/bmp", "image/tiff", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv", "application/zip", "application/x-rar-compressed",
]);

export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      throw new AppError("INVALID_FORM_DATA", "Request must be multipart/form-data", 400);
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new AppError("MISSING_FILE", "No file provided", 400);
    }

    if (file.size === 0) throw new AppError("EMPTY_FILE", "File is empty", 400);
    if (file.size > MAX_FILE_SIZE) throw new AppError("FILE_TOO_LARGE", `File exceeds ${MAX_FILE_SIZE / (1024 * 1024)} MB limit`, 400);
    if (!ALLOWED_MIMES.has(file.type) && !isAllowedExtension(file.name)) {
      throw new AppError("INVALID_FILE_TYPE", `Unsupported file type: ${file.type || "unknown"}`, 400);
    }

    const rawMetadata = {
      caseId: formData.get("caseId"),
      category: formData.get("category"),
      notes: formData.get("notes"),
    };
    const metadata = uploadMetadataSchema.parse(rawMetadata);

    const { data: caseRecord, error: caseError } = await supabase
      .from("Case")
      .select("id, organizationId, clientId")
      .eq("id", metadata.caseId)
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
      entityId: metadata.caseId,
      category: metadata.category,
      fileName: storageFileName,
    });

    const pathCheck = validateStoragePath(storagePath);
    if (!pathCheck.valid) {
      throw new AppError("INVALID_PATH", pathCheck.reason ?? "Invalid storage path", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadResult, error: uploadError } = await uploadFile({
      bucket: StorageBuckets.CLIENT_DOCUMENTS,
      path: storagePath,
      file: buffer,
      contentType: file.type,
      upsert: false,
    });

    if (uploadError || !uploadResult) {
      throw new AppError("UPLOAD_FAILED", uploadError ?? "Failed to upload file to storage", 500);
    }

    const { data: document, error: insertError } = await supabase
      .from("Document")
      .insert({
        caseId: metadata.caseId,
        clientId: caseRecord.clientId,
        uploadedById: prismaUser.id,
        name: file.name,
        storagePath: uploadResult.path,
        mimeType: file.type,
        sizeBytes: file.size,
        category: metadata.category as DocCatType,
        notes: metadata.notes || null,
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
        metadata: { fileName: file.name, caseId: metadata.caseId, category: metadata.category, sizeBytes: file.size },
      });

    if (logError) console.warn("ActivityLog insert failed:", logError.message);

    return successResponse(document, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
