// ═══════════════════════════════════════════════════════════════════════════
// POST /api/acknowledgements/attach
// ═══════════════════════════════════════════════════════════════════════════
// Auth: session required, scoped to the user's organization.
// Body: { documentId } — the merged PDF uploaded by the firm.
//
// Appends one acknowledgement page (statement + document list + Client name /
// Signature / Date) to the merged PDF, stores the combined file as a document
// on the client's file, creates the acknowledgement record, and emails the
// client a signing link. Signing later stamps the name, signature and date
// onto a copy of the same page.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError, AppError } from "@/lib/api/errors";
import {
  acknowledgementUrl,
  generateAcknowledgementToken,
} from "@/lib/portal-token";
import { sendEmail, orgSender } from "@/lib/email/resend";
import { appendAcknowledgementPage } from "@/lib/pdf/acknowledgement-page";
import {
  ACKNOWLEDGEMENT_STATEMENT_VERSION,
  acknowledgementStatement,
  type AcknowledgementItem,
} from "@/lib/document-acknowledgement";

const attachSchema = z.object({ documentId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { organization, prismaUser } = await requireAuth();
    const parsed = attachSchema.safeParse(await req.json());
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Choose the merged PDF to attach the page to", null, 422);
    }

    const db = getSupabaseAdmin();

    const { data: source, error: sourceErr } = await db
      .from("Document")
      .select("id, name, category, storagePath, mimeType, caseId, clientId, client:Client!inner(id, firstName, lastName, email, organizationId)")
      .eq("id", parsed.data.documentId)
      .single();

    const client = source ? (Array.isArray(source.client) ? source.client[0] : source.client) : null;
    if (sourceErr || !source || !client || client.organizationId !== organization.id) {
      return errorResponse("NOT_FOUND", "Document not found", null, 404);
    }
    if (source.mimeType !== "application/pdf" || !(source.name as string).toLowerCase().endsWith(".pdf")) {
      return errorResponse("NOT_PDF", "The acknowledgement page can only be attached to a PDF", null, 422);
    }

    const { data: file, error: downloadErr } = await db.storage
      .from("client-documents")
      .download(source.storagePath as string);
    if (downloadErr || !file) {
      throw new AppError("STORAGE_ERROR", "Could not read the uploaded PDF", 500);
    }
    const sourceBytes = Buffer.from(await file.arrayBuffer());

    const { data: org } = await db
      .from("Organization")
      .select("name, email, phone, addressLine1, city, province, postalCode, ciccRegistrationNumber, settings")
      .eq("id", organization.id)
      .maybeSingle();
    const { data: rcic } = await db
      .from("User")
      .select("name")
      .eq("organizationId", organization.id)
      .in("role", ["OWNER", "ADMIN"])
      .order("createdAt", { ascending: true })
      .limit(1)
      .maybeSingle();

    const firmName = org?.name ?? "Immigration Services";
    const ackId = randomUUID();
    const reference = ackId.slice(0, 8).toUpperCase();
    const clientName = `${client.firstName} ${client.lastName}`;

    const combined = await appendAcknowledgementPage(sourceBytes, {
      firm: {
        name: firmName,
        address: [org?.addressLine1, org?.city, org?.province, org?.postalCode].filter(Boolean).join(", "),
        phone: org?.phone ?? undefined,
        email: org?.email ?? undefined,
        rcicName: rcic?.name ?? undefined,
        ciccNumber: org?.ciccRegistrationNumber ?? undefined,
      },
      clientName,
      clientEmail: client.email,
      reference,
      documents: [source.name as string],
      statement: acknowledgementStatement(firmName),
    });

    const storagePath = `${organization.id}/acknowledgements/${ackId}/with-acknowledgement.pdf`;
    const { error: uploadErr } = await db.storage
      .from("client-documents")
      .upload(storagePath, combined, { contentType: "application/pdf", upsert: true });
    if (uploadErr) throw new AppError("STORAGE_ERROR", "Could not save the combined PDF", 500);

    const baseName = (source.name as string).replace(/\.pdf$/i, "");
    const { data: combinedDoc, error: docErr } = await db
      .from("Document")
      .insert({
        caseId: source.caseId,
        clientId: source.clientId,
        uploadedById: prismaUser.id,
        name: `${baseName} — with acknowledgement.pdf`,
        storagePath,
        mimeType: "application/pdf",
        sizeBytes: combined.length,
        category: source.category,
        notes: `Acknowledgement page appended to "${source.name}".`,
      })
      .select("id")
      .single();
    if (docErr || !combinedDoc) throw new AppError("DB_ERROR", "Could not file the combined PDF", 500);

    const items: AcknowledgementItem[] = [
      {
        documentId: source.id as string,
        name: source.name as string,
        category: source.category as string,
        uploadedAt: null,
        applicantLabel: null,
        notes: null,
      },
    ];

    const now = new Date().toISOString();
    const { data: ack, error: ackErr } = await db
      .from("DocumentAcknowledgement")
      .insert({
        id: ackId,
        organizationId: organization.id,
        clientId: client.id,
        caseId: source.caseId,
        title: `Document Acknowledgement — ${baseName}`,
        status: "PENDING",
        sourceDocumentId: source.id,
        sourceDocumentName: source.name,
        unsignedDocumentId: combinedDoc.id,
        items,
        itemCount: items.length,
        statementVersion: ACKNOWLEDGEMENT_STATEMENT_VERSION,
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .select("id")
      .single();
    if (ackErr || !ack) throw new AppError("DB_ERROR", ackErr?.message ?? "Could not create the acknowledgement", 500);

    const token = generateAcknowledgementToken(ack.id, client.id, organization.id, 30);
    const link = acknowledgementUrl(token, req.headers.get("origin") ?? undefined);

    const emailResult = await sendEmail({
      ...orgSender({ name: firmName, email: org?.email, settings: org?.settings }),
      to: { email: client.email, name: clientName },
      subject: `Please sign the acknowledgement page — ${firmName}`,
      text: `Hi ${client.firstName},\n\nWe have attached your documents to a single file and added an acknowledgement page that asks you to confirm you provided them.\n\nSign here: ${link}\n\nThis link is valid for 30 days. Contact us if you need a new one.\n\n${firmName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">Hi ${client.firstName},</h2>
          <p style="color:#555;margin-top:0">We have attached your documents to a single file and added an acknowledgement page that asks you to confirm you provided them.</p>
          <p style="color:#555;font-size:13px">File: <strong>${String(source.name).replace(/</g, "&lt;")}</strong></p>
          <p>
            <a href="${link}" style="display:inline-block;background:#0f3b63;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open and sign</a>
          </p>
          <p style="font-size:12px;color:#888">This link is valid for 30 days. Contact us if you need a new one.</p>
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0"/>
          <p style="font-size:11px;color:#888;margin:0">${firmName} · Immigration Consulting Services</p>
        </div>
      `,
    });

    return successResponse(
      { id: ack.id, url: link, documentId: combinedDoc.id, reference, emailed: emailResult.success },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
