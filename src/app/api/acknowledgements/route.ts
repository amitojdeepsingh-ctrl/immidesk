// ═══════════════════════════════════════════════════════════════════════════
// POST /api/acknowledgements — create a document acknowledgement for a client
// ═══════════════════════════════════════════════════════════════════════════
// Auth: session required, scoped to the user's organization.
// Body: { clientId, caseId?, documentIds? }
//
// Snapshots the document list at send time, creates the record, and emails
// the client a signing link. Passing documentIds limits the acknowledgement
// to those documents; omitting it covers every document on file for the
// client, newest first.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError, AppError } from "@/lib/api/errors";
import {
  acknowledgementUrl,
  generateAcknowledgementToken,
  resolveAppUrl,
} from "@/lib/portal-token";
import { sendEmail, orgSender } from "@/lib/email/resend";
import {
  ACKNOWLEDGEMENT_STATEMENT_VERSION,
  buildAcknowledgementTitle,
  type AcknowledgementItem,
} from "@/lib/document-acknowledgement";

const createSchema = z.object({
  clientId: z.string().min(1),
  caseId: z.string().min(1).optional(),
  documentIds: z.array(z.string().min(1)).max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Choose a client and the documents to acknowledge", null, 422);
    }
    const { clientId, documentIds } = parsed.data;

    const db = getSupabaseAdmin();

    const { data: client } = await db
      .from("Client")
      .select("id, firstName, lastName, email, organizationId")
      .eq("id", clientId)
      .eq("organizationId", organization.id)
      .maybeSingle();
    if (!client) return errorResponse("NOT_FOUND", "Client not found", null, 404);
    if (!client.email) {
      return errorResponse("NO_EMAIL", "This client has no email address on file", null, 422);
    }

    let caseId = parsed.data.caseId ?? null;
    let applicationLabel: string | null = null;

    if (!caseId) {
      const { data: latestCase } = await db
        .from("Case")
        .select("id, title, caseType")
        .eq("clientId", clientId)
        .eq("organizationId", organization.id)
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle();
      caseId = latestCase?.id ?? null;
      applicationLabel = latestCase?.caseType ?? null;
    } else {
      const { data: kase } = await db
        .from("Case")
        .select("caseType")
        .eq("id", caseId)
        .eq("organizationId", organization.id)
        .maybeSingle();
      applicationLabel = kase?.caseType ?? null;
    }

    let query = db
      .from("Document")
      .select("id, name, category, createdAt, applicantLabel, notes, caseId")
      .eq("clientId", clientId);
    if (documentIds?.length) query = query.in("id", documentIds);

    const { data: documents, error: docErr } = await query.order("createdAt", { ascending: false });
    if (docErr) throw new AppError("DB_ERROR", "Could not load documents", 500);
    if (!documents?.length) {
      return errorResponse("NO_DOCUMENTS", "There are no documents to acknowledge yet", null, 422);
    }

    const items: AcknowledgementItem[] = documents.map((d) => ({
      documentId: d.id as string,
      name: d.name as string,
      category: d.category as string,
      uploadedAt: (d.createdAt as string) ?? null,
      applicantLabel: (d.applicantLabel as string | null) ?? null,
      notes: (d.notes as string | null) ?? null,
    }));

    const now = new Date().toISOString();
    const title = buildAcknowledgementTitle(applicationLabel);

    const { data: created, error: insertErr } = await db
      .from("DocumentAcknowledgement")
      .insert({
        organizationId: organization.id,
        clientId,
        caseId,
        title,
        status: "PENDING",
        items,
        itemCount: items.length,
        statementVersion: ACKNOWLEDGEMENT_STATEMENT_VERSION,
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .select("id")
      .single();
    if (insertErr || !created) {
      throw new AppError("DB_ERROR", insertErr?.message ?? "Could not create acknowledgement", 500);
    }

    const token = generateAcknowledgementToken(created.id, clientId, organization.id, 30);
    const origin = req.headers.get("origin") ?? undefined;
    const link = acknowledgementUrl(token, origin);
    const clientName = `${client.firstName} ${client.lastName}`;

    const { data: org } = await db
      .from("Organization")
      .select("name, email, settings")
      .eq("id", organization.id)
      .maybeSingle();

    const emailResult = await sendEmail({
      ...orgSender({ name: org?.name ?? "Immigration Services", email: org?.email, settings: org?.settings }),
      to: { email: client.email as string, name: clientName },
      subject: `Please confirm your documents — ${org?.name ?? "Immigration Services"}`,
      text: `Hi ${client.firstName},\n\nWe have ${items.length} document${items.length === 1 ? "" : "s"} on file for you. Please review each one and confirm that you provided them.\n\nConfirm here: ${link}\n\nThis link is valid for 30 days. Contact us if you need a new one.\n\n${org?.name ?? ""}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">Hi ${client.firstName},</h2>
          <p style="color:#555;margin-top:0">We have <strong>${items.length}</strong> document${items.length === 1 ? "" : "s"} on file for you. Please review each one and confirm that you provided them.</p>
          <ul style="color:#555;font-size:13px">
            ${items.slice(0, 12).map((i) => `<li>${i.name.replace(/</g, "&lt;")}</li>`).join("")}
            ${items.length > 12 ? `<li>and ${items.length - 12} more</li>` : ""}
          </ul>
          <p>
            <a href="${link}" style="display:inline-block;background:#0f3b63;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Review and confirm</a>
          </p>
          <p style="font-size:12px;color:#888">This link is valid for 30 days. Contact us if you need a new one.</p>
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0"/>
          <p style="font-size:11px;color:#888;margin:0">${org?.name ?? ""} · Immigration Consulting Services</p>
        </div>
      `,
    });

    return successResponse(
      {
        id: created.id,
        url: link,
        baseUrl: resolveAppUrl(origin),
        itemCount: items.length,
        emailed: emailResult.success,
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
