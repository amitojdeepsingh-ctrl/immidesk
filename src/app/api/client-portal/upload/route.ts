// ═══════════════════════════════════════════════════════════════════════════
// POST /api/client-portal/upload — Client-facing document upload
// ═══════════════════════════════════════════════════════════════════════════
// Auth: Token-based (no session required). The token encodes clientId,
// caseId, organizationId, and expiry, signed with HMAC-SHA256.
// Clients receive a secure upload link and can upload documents directly.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  successResponse,
  errorResponse,
  handleApiError,
  AppError,
} from "@/lib/api/errors";
import { uploadFileAdmin, StorageBuckets, getStoragePath } from "@/lib/storage";
import { sendEmail } from "@/lib/email/resend";
import {
  sanitizeFileName,
  getExtensionFromMimeType,
  isAllowedExtension,
  validateStoragePath,
} from "@/lib/document-naming";
import { DocumentCategory } from "@/types";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";

// ─── Token utilities ───────────────────────────────────────────────────────

const TOKEN_SECRET = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "fallback-dev-secret";
const TOKEN_SEPARATOR = ".";

interface PortalToken {
  clientId: string;
  caseId: string;
  organizationId: string;
  expiresAt: number; // Unix timestamp in seconds
}

/**
 * Verify a client portal upload token.
 * Returns the decoded payload if valid, null otherwise.
 */
function verifyToken(token: string): PortalToken | null {
  try {
    const parts = token.split(TOKEN_SEPARATOR);
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;

    // Verify HMAC
    const expectedSig = createHmac("sha256", TOKEN_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    const sigBuffer = Buffer.from(signature, "base64url");
    const expectedBuffer = Buffer.from(expectedSig, "base64url");

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    // Decode payload
    const payload: PortalToken = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8"),
    );

    // Check expiry
    if (Date.now() > payload.expiresAt * 1000) return null;

    // Validate required fields
    if (!payload.clientId || !payload.caseId || !payload.organizationId) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate a client portal upload token (used server-side to create links).
 * Exported for use by other server modules (e.g., email generation).
 */
export function generatePortalToken(
  clientId: string,
  caseId: string,
  organizationId: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60, // 7 days default
): string {
  const payload: PortalToken = {
    clientId,
    caseId,
    organizationId,
    expiresAt: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = createHmac("sha256", TOKEN_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}${TOKEN_SEPARATOR}${signature}`;
}

// ─── Validation ────────────────────────────────────────────────────────────

const portalUploadSchema = z.object({
  token: z.string().min(1, "Token is required"),
  category: z
    .nativeEnum(DocumentCategory)
    .optional()
    .default(DocumentCategory.OTHER),
  notes: z.string().max(1000).optional().default(""),
});

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
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
]);

// ─── POST Handler ──────────────────────────────────────────────────────────

/**
 * POST /api/client-portal/upload
 *
 * Multipart form data:
 *   file: File (required)
 *   token: string (required) — secure upload token
 *   category?: DocumentCategory (default: OTHER)
 *   notes?: string (optional)
 *
 * No session auth required — the token proves the client''s right to upload.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Parse multipart form data ────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      throw new AppError(
        "INVALID_FORM_DATA",
        "Request must be multipart/form-data",
        400,
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new AppError("MISSING_FILE", "No file provided", 400);
    }

    // ── Validate file ────────────────────────────────────────────────────
    if (file.size === 0) {
      throw new AppError("EMPTY_FILE", "File is empty", 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        "FILE_TOO_LARGE",
        `File exceeds ${MAX_FILE_SIZE / (1024 * 1024)} MB limit`,
        400,
      );
    }
    if (!ALLOWED_MIMES.has(file.type) && !isAllowedExtension(file.name)) {
      throw new AppError(
        "INVALID_FILE_TYPE",
        `Unsupported file type: ${file.type || "unknown"}`,
        400,
      );
    }

    // ── Parse client info fields ─────────────────────────────────────────
    const clientInfo: Record<string, string> = {};
    const clientInfoFields = [
      "clientFirstName",
      "clientLastName",
      "clientDateOfBirth",
      "clientPassportNumber",
      "clientAddressLine1",
      "clientCity",
      "clientProvince",
      "clientPostalCode",
      "clientCountry",
    ];
    for (const field of clientInfoFields) {
      const val = formData.get(field);
      if (val && typeof val === "string" && val.trim()) {
        clientInfo[field] = val.trim();
      }
    }

    // ── Parse and validate metadata ──────────────────────────────────────
    const rawMetadata = {
      token: formData.get("token"),
      category: formData.get("category"),
      notes: formData.get("notes"),
    };
    const metadata = portalUploadSchema.parse(rawMetadata);

    // ── Verify token ─────────────────────────────────────────────────────
    const portalToken = verifyToken(metadata.token);
    if (!portalToken) {
      throw new AppError(
        "INVALID_TOKEN",
        "Upload link is invalid or expired. Please request a new link.",
        401,
      );
    }

    // ── Verify case and client exist and match token ─────────────────────
    const supabase = getSupabaseAdmin();
    const { data: caseRecord } = await supabase
      .from("Case")
      .select("id, organizationId, clientId, title")
      .eq("id", portalToken.caseId)
      .single();

    if (
      !caseRecord ||
      caseRecord.organizationId !== portalToken.organizationId ||
      caseRecord.clientId !== portalToken.clientId
    ) {
      throw new AppError(
        "TOKEN_MISMATCH",
        "Upload link does not match any active case",
        403,
      );
    }

    // ── Sanitize filename and build storage path ─────────────────────────
    const safeName = sanitizeFileName(file.name);
    const extension = getExtensionFromMimeType(file.type);
    const storageFileName = safeName.endsWith(extension)
      ? safeName
      : safeName + extension;

    const storagePath = getStoragePath({
      orgId: portalToken.organizationId,
      entityType: "cases",
      entityId: portalToken.caseId,
      category: metadata.category,
      fileName: storageFileName,
    });

    const pathCheck = validateStoragePath(storagePath);
    if (!pathCheck.valid) {
      throw new AppError(
        "INVALID_PATH",
        pathCheck.reason ?? "Invalid storage path",
        400,
      );
    }

    // ── Update client record if info provided ────────────────────────────
    if (Object.keys(clientInfo).length > 0) {
      const clientUpdate: Record<string, string> = {};
      if (clientInfo.clientFirstName) clientUpdate.firstName = clientInfo.clientFirstName;
      if (clientInfo.clientLastName) clientUpdate.lastName = clientInfo.clientLastName;
      if (clientInfo.clientDateOfBirth) {
        // Convert HTML date input (YYYY-MM-DD) to ISO datetime
        clientUpdate.dateOfBirth = new Date(clientInfo.clientDateOfBirth + "T00:00:00.000Z").toISOString();
      }
      if (clientInfo.clientPassportNumber) clientUpdate.passportNumber = clientInfo.clientPassportNumber;
      if (clientInfo.clientAddressLine1) clientUpdate.addressLine1 = clientInfo.clientAddressLine1;
      if (clientInfo.clientCity) clientUpdate.city = clientInfo.clientCity;
      if (clientInfo.clientProvince) clientUpdate.province = clientInfo.clientProvince;
      if (clientInfo.clientPostalCode) clientUpdate.postalCode = clientInfo.clientPostalCode;
      if (clientInfo.clientCountry) clientUpdate.country = clientInfo.clientCountry;

      const { error: clientUpdateError } = await supabase
        .from("Client")
        .update(clientUpdate)
        .eq("id", portalToken.clientId);

      if (clientUpdateError) {
        console.warn("Client update failed:", clientUpdateError.message);
      }
    }

    // ── Build auto-labeled document name ─────────────────────────────────
    const clientLabel = clientInfo.clientFirstName && clientInfo.clientLastName
      ? `${clientInfo.clientFirstName} ${clientInfo.clientLastName}`
      : null;
    const documentName = clientLabel
      ? `${clientLabel} - ${file.name}`
      : file.name;

    // ── Upload to Supabase Storage (admin client — no session needed) ────
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadResult, error: uploadError } = await uploadFileAdmin({
      bucket: StorageBuckets.CLIENT_DOCUMENTS,
      path: storagePath,
      file: buffer,
      contentType: file.type,
      upsert: false,
    });

    if (uploadError || !uploadResult) {
      throw new AppError(
        "UPLOAD_FAILED",
        uploadError ?? "Failed to upload file to storage",
        500,
      );
    }

    // ── Create Document record ───────────────────────────────────────────
    const { data: orgUser } = await supabase
      .from("User")
      .select("id")
      .eq("organizationId", portalToken.organizationId)
      .order("createdAt", { ascending: true })
      .limit(1)
      .single();

    const uploadedById = orgUser?.id ?? "system";

    const { data: document, error: insertError } = await supabase
      .from("Document")
      .insert({
        caseId: portalToken.caseId,
        clientId: portalToken.clientId,
        uploadedById: uploadedById,
        name: documentName,
        storagePath: uploadResult.path,
        mimeType: file.type,
        sizeBytes: file.size,
        category: metadata.category,
        notes: metadata.notes || "Uploaded by client via portal",
      })
      .select()
      .single();

    if (insertError) throw new AppError("INSERT_FAILED", insertError.message, 500);

    // ── Log activity ─────────────────────────────────────────────────────
    const { error: logError } = await supabase
      .from("ActivityLog")
      .insert({
        organizationId: portalToken.organizationId,
        userId: uploadedById,
        action: "DOCUMENT_UPLOADED_BY_CLIENT",
        entityType: "Document",
        entityId: document.id,
        metadata: { fileName: documentName, caseId: portalToken.caseId, clientId: portalToken.clientId, source: "client-portal" },
      });

    if (logError) console.warn("ActivityLog insert failed:", logError.message);

    // ── Notify the org's staff that a client uploaded a document ─────────
    try {
      const { data: staffUsers } = await supabase
        .from("User")
        .select("email, firstName, lastName")
        .eq("organizationId", portalToken.organizationId)
        .limit(5);

      const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://mqh56s7s-47hx.vercel.app";
      const caseUrl = `${appUrl}/cases/${portalToken.caseId}`;
      const clientDisplayName = clientLabel ?? "Your client";

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
          <h2 style="margin-bottom:4px">📄 New document uploaded</h2>
          <p style="color:#555;margin-top:0">A client just submitted a document through the secure upload portal.</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr><td style="padding:6px 0;color:#888;width:120px">Client</td><td style="padding:6px 0;font-weight:600">${clientDisplayName}</td></tr>
            <tr><td style="padding:6px 0;color:#888">File</td><td style="padding:6px 0">${documentName}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Case</td><td style="padding:6px 0">${caseRecord.title}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Category</td><td style="padding:6px 0">${metadata.category}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Size</td><td style="padding:6px 0">${(file.size / 1024).toFixed(1)} KB</td></tr>
          </table>
          <a href="${caseUrl}" style="display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">View Case &rarr;</a>
          <p style="color:#aaa;font-size:12px;margin-top:24px">ADS Immigration Services · ImmigDesk</p>
        </div>
      `;

      if (staffUsers && staffUsers.length > 0) {
        await sendEmail({
          to: staffUsers.map(u => ({ email: u.email, name: `${u.firstName} ${u.lastName}` })),
          subject: `📄 ${clientDisplayName} uploaded: ${documentName}`,
          html,
        });
      }
    } catch (emailErr) {
      console.warn("Notification email failed:", emailErr);
    }

    return successResponse(
      {
        id: document.id,
        name: documentName,
        category: document.category,
        sizeBytes: document.sizeBytes,
        createdAt: document.createdAt,
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
