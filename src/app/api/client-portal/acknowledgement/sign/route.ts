// ═══════════════════════════════════════════════════════════════════════════
// POST /api/client-portal/acknowledgement/sign
// ═══════════════════════════════════════════════════════════════════════════
// Auth: token-based (no session required).
// Body: { token, acknowledgementId, signatureData, printedName, clientNote? }
//
// Records the signature, IP, user agent and timestamp against the snapshot
// of documents taken when the acknowledgement was sent, files a signed PDF,
// and notifies the firm.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAcknowledgementToken, resolveAppUrl } from "@/lib/portal-token";
import { sendEmail, orgSender } from "@/lib/email/resend";
import { generateAcknowledgementPdf } from "@/lib/pdf/acknowledgement-pdf";
import {
  buildAcknowledgementClauses,
  type AcknowledgementItem,
} from "@/lib/document-acknowledgement";

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
        id, status, title, items, itemCount, statementVersion, clientNote,
        client:Client!inner(id, firstName, lastName, email),
        case:Case(id, title, caseType),
        organization:Organization!inner(id, name, email, phone, addressLine1, city, province, postalCode, ciccRegistrationNumber, settings)
      `)
      .eq("id", acknowledgementId)
      .eq("organizationId", payload.organizationId)
      .single();

    if (ackErr || !ack) return NextResponse.json({ error: "Acknowledgement not found" }, { status: 404 });
    if (ack.status === "SIGNED") return NextResponse.json({ ok: true, alreadySigned: true });

    const client = Array.isArray(ack.client) ? ack.client[0] : ack.client;
    const kase = Array.isArray(ack.case) ? ack.case[0] : ack.case;
    const org = Array.isArray(ack.organization) ? ack.organization[0] : ack.organization;
    if (!client || !org) return NextResponse.json({ error: "Acknowledgement not found" }, { status: 404 });

    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = headerList.get("user-agent") ?? null;
    const now = new Date().toISOString();
    const items = (Array.isArray(ack.items) ? ack.items : []) as AcknowledgementItem[];
    const clientName = `${client.firstName} ${client.lastName}`;

    // ── Signed PDF ──────────────────────────────────────────────────────────
    let pdfStoragePath: string | null = null;
    try {
      const pdf = generateAcknowledgementPdf({
        firm: {
          name: org.name,
          address: [org.addressLine1, org.city, org.province, org.postalCode].filter(Boolean).join(", "),
          phone: org.phone ?? undefined,
          email: org.email ?? undefined,
          ciccNumber: org.ciccRegistrationNumber ?? undefined,
        },
        client: { fullName: clientName, email: client.email },
        acknowledgement: {
          id: acknowledgementId,
          title: ack.title,
          statementVersion: ack.statementVersion,
          items,
          clauses: buildAcknowledgementClauses({
            clientName,
            applicationLabel: (kase?.caseType as string | null) ?? null,
          }),
          printedName: String(printedName),
          clientNote: clientNote ? String(clientNote) : null,
          signedAt: now,
          signedIp: ip,
          signatureDataUrl: signatureData,
        },
      });

      const path = `${payload.organizationId}/acknowledgements/${acknowledgementId}/signed-acknowledgement.pdf`;
      const { error: uploadErr } = await db.storage.from("client-documents").upload(path, pdf, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (uploadErr) console.warn("Acknowledgement PDF upload failed:", uploadErr.message);
      else pdfStoragePath = path;

      const base64 = String(signatureData).replace(/^data:image\/png;base64,/, "");
      const { error: sigErr } = await db.storage
        .from("client-documents")
        .upload(
          `${payload.organizationId}/acknowledgements/${acknowledgementId}/signature.png`,
          Buffer.from(base64, "base64"),
          { contentType: "image/png", upsert: true },
        );
      if (sigErr) console.warn("Acknowledgement signature storage failed:", sigErr.message);
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
          title: `Documents acknowledged: ${clientName}`,
          message: `${clientName} signed the document acknowledgement covering ${items.length} document${items.length === 1 ? "" : "s"}${kase?.title ? ` for ${kase.title}` : ""}.${clientNote ? " Disclosure attached." : ""}`,
          link,
        });
        if (notifErr) console.warn("Acknowledgement notification failed:", notifErr.message);
      }

      const firmEmail = org.email || team?.[0]?.email;
      if (firmEmail) {
        await sendEmail({
          ...orgSender({ name: org.name, email: org.email, settings: org.settings }),
          to: { email: firmEmail },
          subject: `Documents acknowledged — ${clientName}`,
          text: `${clientName} signed the document acknowledgement covering ${items.length} document${items.length === 1 ? "" : "s"}.\n\nSigned: ${new Date(now).toLocaleString("en-CA", { timeZone: "America/Los_Angeles" })} Pacific\nIP: ${ip}\n\n${clientNote ? `Client disclosure: ${clientNote}\n\n` : ""}Open the client file: ${resolveAppUrl()}/clients/${client.id}/documents`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
              <h2 style="font-size:18px;font-weight:700">Documents acknowledged</h2>
              <p><strong>${clientName}</strong> signed the document acknowledgement covering <strong>${items.length}</strong> document${items.length === 1 ? "" : "s"}${kase?.title ? ` for ${kase.title}` : ""}.</p>
              <p style="font-size:13px;color:#555">Signed ${new Date(now).toLocaleString("en-CA", { timeZone: "America/Los_Angeles" })} Pacific · IP ${ip}</p>
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
        subject: `Your document acknowledgement is signed — ${org.name}`,
        text: `Hi ${client.firstName},\n\nThis confirms that you signed the document acknowledgement for ${items.length} document${items.length === 1 ? "" : "s"} on ${new Date(now).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}.\n\nA signed copy is on file with us. If anything changes about these documents, please tell us right away.\n\n${org.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
            <h2 style="font-size:18px;font-weight:700">Hi ${client.firstName},</h2>
            <p>This confirms that you signed the document acknowledgement for <strong>${items.length}</strong> document${items.length === 1 ? "" : "s"} on ${new Date(now).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}.</p>
            <p style="font-size:13px;color:#555">A signed copy is on file with us. If anything changes about these documents, please tell us right away.</p>
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0"/>
            <p style="font-size:11px;color:#888;margin:0">${org.name}</p>
          </div>
        `,
      }).catch((e) => console.warn("Acknowledgement client email failed:", e));
    }

    return NextResponse.json({ ok: true, itemCount: items.length, pdfStoragePath });
  } catch (err) {
    console.error("acknowledgement/sign error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
