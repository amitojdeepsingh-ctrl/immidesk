import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAgreementToken } from "@/lib/portal-token";
import { sendEmail } from "@/lib/email/resend";
import { generateAgreementPdf } from "@/lib/pdf/generator";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { token, agreementId, signatureData } = await req.json();
    if (!token || !agreementId || !signatureData) {
      return NextResponse.json({ error: "token, agreementId, signatureData required" }, { status: 400 });
    }

    const payload = verifyAgreementToken(token);
    if (!payload || payload.agreementId !== agreementId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const db = getSupabaseAdmin();

    // Fetch full agreement + client + org details (including terms for PDF)
    const { data: agreement } = await db
      .from("ServiceAgreement")
      .select("id, status, title, description, feeAmount, feeCurrency, feeStructure, paymentSchedule, serviceType, startDate, endDate, terms, client:Client!inner(firstName, lastName, email, phone, nationality, addressLine1, city, province, postalCode, country), organization:Organization!inner(name, phone, ciccRegistrationNumber, addressLine1, city, province, postalCode)")
      .eq("id", agreementId)
      .eq("organizationId", payload.organizationId)
      .single();

    if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    if (agreement.status === "SIGNED") return NextResponse.json({ ok: true, alreadySigned: true });

    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

    const client = Array.isArray(agreement.client) ? agreement.client[0] : agreement.client;
    const org = Array.isArray(agreement.organization) ? agreement.organization[0] : agreement.organization;
    const now = new Date().toISOString();
    const fmtFee = new Intl.NumberFormat("en-CA", { style: "currency", currency: agreement.feeCurrency }).format(agreement.feeAmount);

    // ── Generate signed PDF ─────────────────────────────────────────────────
    let pdfStoragePath: string | null = null;
    try {
      const terms = (agreement.terms ?? {}) as Record<string, unknown>;
      const clientAddress = [client.addressLine1, client.city, client.province, client.postalCode, client.country].filter(Boolean).join(", ");
      const orgAddress = [org.addressLine1, org.city, org.province, org.postalCode].filter(Boolean).join(", ");

      const pdfBuffer = await generateAgreementPdf({
        firm: {
          name: org.name,
          rcicName: "Amitojdeep Singh",
          address: orgAddress || undefined,
          ciccNumber: org.ciccRegistrationNumber ?? undefined,
          phone: org.phone ?? undefined,
        },
        client: {
          fullName: `${client.firstName} ${client.lastName}`,
          email: client.email,
          phone: client.phone ?? undefined,
          address: clientAddress || undefined,
          nationality: client.nationality ?? undefined,
        },
        agreement: {
          title: agreement.title,
          description: agreement.description ?? undefined,
          serviceType: agreement.serviceType as never,
          feeAmount: agreement.feeAmount,
          feeCurrency: agreement.feeCurrency,
          feeStructure: (agreement.feeStructure ?? "flat") as never,
          paymentSchedule: (agreement.paymentSchedule ?? "upfront") as never,
          startDate: agreement.startDate ?? undefined,
          endDate: agreement.endDate ?? undefined,
          signatureDataUrl: signatureData,
          terms: {
            scopeOfWork: String(terms.scopeOfWork ?? "As agreed with your consultant."),
            feesAndPayment: String(terms.feesAndPayment ?? `Total fee: ${fmtFee}`),
            clientResponsibilities: String(terms.clientResponsibilities ?? "Provide accurate and complete information."),
            confidentiality: String(terms.confidentiality ?? "All information shared is kept strictly confidential."),
            termination: String(terms.termination ?? "Either party may terminate with 15 days written notice."),
            governingLaw: String(terms.governingLaw ?? "Province of British Columbia, Canada"),
            additionalClauses: Array.isArray(terms.additionalClauses) ? (terms.additionalClauses as string[]) : undefined,
          },
        },
        meta: {
          agreementNumber: agreementId.slice(0, 8).toUpperCase(),
          generatedAt: new Date(now).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }),
          version: "1.0",
        },
      });

      const pdfPath = `${payload.organizationId}/agreements/${agreementId}/signed-agreement.pdf`;
      const { error: uploadErr } = await db.storage.from("client-documents").upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (uploadErr) {
        console.warn("PDF upload failed:", uploadErr.message);
      } else {
        pdfStoragePath = pdfPath;
      }

      // Also store signature PNG separately for reference
      const base64 = signatureData.replace(/^data:image\/png;base64,/, "");
      const sigBuf = Buffer.from(base64, "base64");
      await db.storage.from("client-documents").upload(
        `${payload.organizationId}/agreements/${agreementId}/signature.png`,
        sigBuf,
        { contentType: "image/png", upsert: true },
      ).catch(e => console.warn("Signature PNG storage failed:", e));

    } catch (pdfErr) {
      console.warn("PDF generation failed:", pdfErr);
      // Fall back to storing just the signature PNG path
      try {
        const base64 = signatureData.replace(/^data:image\/png;base64,/, "");
        const buf = Buffer.from(base64, "base64");
        const sigPath = `${payload.organizationId}/agreements/${agreementId}/signature.png`;
        await db.storage.from("client-documents").upload(sigPath, buf, { contentType: "image/png", upsert: true });
        pdfStoragePath = sigPath;
      } catch (e) {
        console.warn("Fallback signature storage failed:", e);
      }
    }

    // Mark agreement as signed (store base64 signature for reliable PDF regeneration)
    const { error: updateErr } = await db
      .from("ServiceAgreement")
      .update({ status: "SIGNED", signedAt: now, signedByClientIp: ip, pdfStoragePath, signatureDataUrl: signatureData, updatedAt: now })
      .eq("id", agreementId);
    if (updateErr) throw updateErr;

    // Notify RCIC
    const { data: rcicUser } = await db
      .from("User")
      .select("email, name")
      .eq("organizationId", payload.organizationId)
      .in("role", ["OWNER", "ADMIN"])
      .order("createdAt", { ascending: true })
      .limit(1)
      .single();

    if (rcicUser?.email) {
      await sendEmail({
        to: { email: rcicUser.email, name: rcicUser.name },
        subject: `✅ Agreement Signed — ${client.firstName} ${client.lastName}`,
        html: `
          <p>Hi ${rcicUser.name},</p>
          <p><strong>${client.firstName} ${client.lastName}</strong> (${client.email}) has signed their service agreement for <strong>${agreement.serviceType}</strong>.</p>
          <p><strong>Fee agreed:</strong> ${fmtFee}</p>
          <p><strong>Signed at:</strong> ${new Date(now).toLocaleString("en-CA")}</p>
          <p>Log in to ImmigDesk to download the signed PDF from the client's Agreement tab.</p>
          <p>— ImmigDesk</p>
        `,
      }).catch(e => console.warn("RCIC notification email failed:", e));
    }

    // Send confirmation copy to client
    await sendEmail({
      to: { email: client.email, name: `${client.firstName} ${client.lastName}` },
      subject: `Your Service Agreement is Signed — ${org.name}`,
      html: `
        <p>Hi ${client.firstName},</p>
        <p>This confirms that your service agreement with <strong>${org.name}</strong> has been successfully signed on <strong>${new Date(now).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</strong>.</p>
        <p><strong>Service:</strong> ${agreement.serviceType.replace(/_/g, " ")}</p>
        <p><strong>Fee:</strong> ${fmtFee}</p>
        <p>A signed copy of your agreement is on file. Your consultant will be in touch with next steps.</p>
        <p>If you have any questions, please contact us directly.</p>
        <p>Thank you for choosing ${org.name}.</p>
        <p>— ${org.name}</p>
      `,
    }).catch(e => console.warn("Client confirmation email failed:", e));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("agreement/sign error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
