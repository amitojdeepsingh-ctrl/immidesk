// ═══════════════════════════════════════════════════════════════════════════
// POST /api/client-portal/acknowledgement/sign
// ═══════════════════════════════════════════════════════════════════════════
// Auth: token-based (no session required).
// Body: { token, acknowledgementId, signatureData, printedName, clientNote? }
//
// Stamps the typed name, drawn signature and date onto the acknowledgement
// page appended to the firm's merged PDF, files the signed copy as a document
// on the client's file, and notifies the firm.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAcknowledgementToken, resolveAppUrl } from "@/lib/portal-token";
import { sendEmail, orgSender } from "@/lib/email/resend";
import { appendAcknowledgementPage } from "@/lib/pdf/acknowledgement-page";
import { acknowledgementStatement } from "@/lib/document-acknowledgement";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, acknowledgementId, signatureData, printedName, clientNote } = body ?? {};

    if (!token || !acknowledgementId || !signatureData || !printedName) {
      return NextResponse.json(
        { error: "token, acknowledgementId, signatureData and printedName are required" },
        { status: 400 },
      );
    }

    const payload = verifyAcknowledgementToken(token);
    if (!payload || payload.acknowledgementId !== acknowledgementId) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    const db = getSupabaseAdmin();

    const { data: ack, error: ackErr } = await db
      .from("DocumentAcknowledgement")
      .select(`
        id, status, title, items, itemCount, statementVersion,
        sourceDocumentId, sourceDocumentName,
        client:Client!inner(id, firstName, lastName, email),
        organization:Organization!inner(id, name, email, phone, addressLine1, city, province, postalCode, ciccRegistrationNumber, settings)
      `)
      .eq("id", acknowledgementId)
      .eq("organizationId", payload.organizationId)
      .single();

    if (ackErr || !ack) return NextResponse.json({ error: "Acknowledgement not found" }, { status: 404 });
    if (ack.status === "SIGNED") return NextResponse.json({ ok: true, alreadySigned: true });

    const client = Array.isArray(ack.client) ? ack.client[0] : ack.client;
    const org = Array.isArray(ack.organization) ? ack.organization[0] : ack.organization;
    if (!client || !org) return NextResponse.json({ error: "Acknowledgement not found" }, { status: 404 });

    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = headerList.get("user-agent") ?? null;
    const now = new Date().toISOString();
    const clientName = `${client.firstName} ${client.lastName}`;
    const dateLine = new Date(now).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Los_Angeles",
    });
    const documents = ack.sourceDocumentName
      ? [ack.sourceDocumentName as string]
      : ((ack.items ?? []) as Array<{ name: string }>).map((i) => i.name);

    // ── Stamp the signed page onto the merged PDF ───────────────────────────
    let pdfStoragePath: string | null = null;
    let signedDocumentId: string | null = null;

    try {
      let baseBytes: Buffer | null = null;
      if (ack.sourceDocumentId) {
        const { data: sourceDoc } = await db
          .from("Document")
          .select("storagePath")
          .eq("id", ack.sourceDocumentId)
          .maybeSingle();
        if (sourceDoc?.storagePath) {
          const { data: file } = await db.storage.from("client-documents").download(sourceDoc.storagePath as string);
          if (file) baseBytes = Buffer.from(await file.arrayBuffer());
        }
      }

      const signedPdf = await appendAcknowledgementPage(baseBytes, {
        firm: {
          name: org.name,
          address: [org.addressLine1, org.city, org.province, org.postalCode].filter(Boolean).join(", "),
          phone: org.phone ?? undefined,
          email: org.email ?? undefined,
          ciccNumber: org.ciccRegistrationNumber ?? undefined,
        },
        clientName,
        clientEmail: client.email,
        reference: acknowledgementId.slice(0, 8).toUpperCase(),
        documents,
        statement: acknowledgementStatement(org.name),
        signed: {
          printedName: String(printedName).slice(0, 200),
          dateLine,
          signaturePngDataUrl: signatureData,
          clientNote: clientNote ? String(clientNote) : null,
        },
      });

      const path = `${payload.organizationId}/acknowledgements/${acknowledgementId}/signed-acknowledgement.pdf`;
      const { error: uploadErr } = await db.storage
        .from("client-documents")
        .upload(path, signedPdf, { contentType: "application/pdf", upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);
      pdfStoragePath = path;

      // File the signed copy alongside the client's documents.
      const baseName = ack.sourceDocumentName
        ? String(ack.sourceDocumentName).replace(/\.pdf$/i, "")
        : `Documents — ${clientName}`;
      const { data: sourceMeta } = ack.sourceDocumentId
        ? await db.from("Document").select("caseId, clientId, category").eq("id", ack.sourceDocumentId).maybeSingle()
        : { data: null };

      const uploaderId = await resolvingUploaderId(db, payload.organizationId);
      if (uploaderId) {
        const { data: signedDoc } = await db
          .from("Document")
          .insert({
            caseId: sourceMeta?.caseId ?? null,
            clientId: sourceMeta?.clientId ?? client.id,
            uploadedById: uploaderId,
            name: `${baseName} — signed acknowledgement.pdf`,
            storagePath: path,
            mimeType: "application/pdf",
            sizeBytes: signedPdf.length,
            category: sourceMeta?.category ?? "OTHER",
            notes: `Signed by ${printedName} on ${dateLine}.`,
          })
          .select("id")
          .single();
        if (signedDoc?.id) signedDocumentId = signedDoc.id;
      }
    } catch (pdfErr) {
      console.warn("Acknowledgement PDF generation failed:", pdfErr);
    }

    const { error: updateErr } = await db
      .from("DocumentAcknowledgement")
      .update({
        status: "SIGNED",
        signedAt: now,
        signedByIp: ip,
        signedUserAgent: userAgent,
        printedName: String(printedName).slice(0, 200),
        clientNote: clientNote ? String(clientNote).slice(0, 4000) : null,
        signatureDataUrl: signatureData,
        pdfStoragePath,
        signedDocumentId,
        updatedAt: now,
      })
      .eq("id", acknowledgementId)
      .eq("status", "PENDING");

    if (updateErr) {
      console.error("Acknowledgement update failed:", updateErr.message);
      return NextResponse.json({ error: "Could not record the signature" }, { status: 500 });
    }

    // ── Notify the firm: bell + email ───────────────────────────────────────
    try {
      const { data: team } = await db
        .from("User")
        .select("id, name, email")
        .eq("organizationId", payload.organizationId);
      const link = `/clients/${client.id}/documents`;

      for (const member of team ?? []) {
        const { error: notifErr } = await db.from("Notification").insert({
          userId: member.id,
          title: `Acknowledgement signed: ${clientName}`,
          message: `${clientName} signed the acknowledgement page for ${ack.sourceDocumentName ?? `${documents.length} document${documents.length === 1 ? "" : "s"}`}.${clientNote ? " Disclosure attached." : ""}`,
          link,
        });
        if (notifErr) console.warn("Acknowledgement notification failed:", notifErr.message);
      }

      const firmEmail = org.email || team?.[0]?.email;
      if (firmEmail) {
        await sendEmail({
          ...orgSender({ name: org.name, email: org.email, settings: org.settings }),
          to: { email: firmEmail },
          subject: `Acknowledgement signed — ${clientName}`,
          text: `${clientName} signed the acknowledgement page${ack.sourceDocumentName ? ` attached to "${ack.sourceDocumentName}"` : ""}.\n\nSigned: ${dateLine} (Pacific)\nIP: ${ip}\n\n${clientNote ? `Client disclosure: ${clientNote}\n\n` : ""}Open the client file: ${resolveAppUrl()}/clients/${client.id}/documents`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
              <h2 style="font-size:18px;font-weight:700">Acknowledgement signed</h2>
              <p><strong>${clientName}</strong> signed the acknowledgement page${ack.sourceDocumentName ? ` attached to <strong>${String(ack.sourceDocumentName).replace(/</g, "&lt;")}</strong>` : ""}.</p>
              <p style="font-size:13px;color:#555">Signed ${dateLine} Pacific · IP ${ip}</p>
              ${clientNote ? `<p style="font-size:13px;color:#92400e"><strong>Client disclosure:</strong> ${String(clientNote).replace(/</g, "&lt;")}</p>` : ""}
              <p><a href="${resolveAppUrl()}/clients/${client.id}/documents" style="display:inline-block;background:#0f3b63;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open client documents</a></p>
            </div>
          `,
        });
      }
    } catch (notifyErr) {
      console.warn("Acknowledgement notify failed:", notifyErr);
    }

    // ── Client copy ────────────────────────────────────────────────────────
    if (client.email) {
      await sendEmail({
        ...orgSender({ name: org.name, email: org.email, settings: org.settings }),
        to: { email: client.email, name: clientName },
        subject: `Your signed acknowledgement — ${org.name}`,
        text: `Hi ${client.firstName},\n\nThis confirms that you signed the acknowledgement page on ${dateLine}.\n\nA signed copy is on file with us. If anything changes about these documents, please tell us right away.\n\n${org.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
            <h2 style="font-size:18px;font-weight:700">Hi ${client.firstName},</h2>
            <p>This confirms that you signed the acknowledgement page on <strong>${dateLine}</strong>.</p>
            <p style="font-size:13px;color:#555">A signed copy is on file with us. If anything changes about these documents, please tell us right away.</p>
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0"/>
            <p style="font-size:11px;color:#888;margin:0">${org.name}</p>
          </div>
        `,
      }).catch((e) => console.warn("Acknowledgement client email failed:", e));
    }

    return NextResponse.json({ ok: true, pdfStoragePath, signedDocumentId });
  } catch (err) {
    console.error("acknowledgement/sign error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** The signed copy is filed against the firm's first admin account. */
async function resolvingUploaderId(
  db: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
): Promise<string | null> {
  const { data } = await db
    .from("User")
    .select("id")
    .eq("organizationId", organizationId)
    .in("role", ["OWNER", "ADMIN"])
    .order("createdAt", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
