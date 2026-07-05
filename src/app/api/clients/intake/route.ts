import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generatePortalToken, generateAgreementToken, portalUrl, agreementUrl } from "@/lib/portal-token";
import { CASE_TYPE_LABELS } from "@/lib/checklists";
import { sendEmail } from "@/lib/email/resend";

export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const body = await req.json();
    const { firstName, lastName, email, phone, caseType, fee, currency } = body;

    if (!firstName || !lastName || !email || !caseType) {
      return NextResponse.json({ error: "firstName, lastName, email, caseType are required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Check for duplicate email
    const { data: existing } = await db
      .from("Client")
      .select("id")
      .eq("organizationId", organization.id)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `A client with email ${email} already exists` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const clientId = crypto.randomUUID();

    // Create client
    const { error: clientErr } = await db.from("Client").insert({
      id: clientId,
      organizationId: organization.id,
      firstName,
      lastName,
      email,
      phone: phone ?? null,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    if (clientErr) throw new Error(clientErr.message);

    // Create case
    const caseId = crypto.randomUUID();
    const caseTitle = `${CASE_TYPE_LABELS[caseType] ?? caseType} — ${firstName} ${lastName}`;
    const { error: caseErr } = await db.from("Case").insert({
      id: caseId,
      organizationId: organization.id,
      clientId,
      caseType,
      status: "INTAKE",
      priority: "NORMAL",
      title: caseTitle,
      createdAt: now,
      updatedAt: now,
    });
    if (caseErr) throw new Error(caseErr.message);

    // Create draft service agreement
    const agreementId = crypto.randomUUID();
    const { error: agErr } = await db.from("ServiceAgreement").insert({
      id: agreementId,
      organizationId: organization.id,
      clientId,
      caseId,
      title: `Service Agreement — ${firstName} ${lastName}`,
      serviceType: caseType,
      status: "DRAFT",
      feeAmount: fee ? parseFloat(fee) : 0,
      feeCurrency: currency ?? "CAD",
      terms: {},
      createdAt: now,
      updatedAt: now,
    });
    if (agErr) console.warn("Agreement insert warning:", agErr.message);

    // Activity log
    await db.from("ActivityLog").insert({
      organizationId: organization.id,
      userId: prismaUser.id,
      action: "CLIENT_CREATED",
      entityType: "Client",
      entityId: clientId,
      metadata: { clientName: `${firstName} ${lastName}`, caseType, caseId },
    });

    // Generate tokens
    const portalToken = generatePortalToken(clientId, caseId, organization.id, 60);
    const agToken = generateAgreementToken(agreementId, clientId, organization.id, 60);
    const portal = portalUrl(portalToken);
    const agreement = agreementUrl(agToken);
    const serviceLabel = CASE_TYPE_LABELS[caseType] ?? caseType;
    const fmtFee = fee ? new Intl.NumberFormat("en-CA", { style: "currency", currency: currency ?? "CAD" }).format(parseFloat(fee)) : null;

    // Send welcome email to client with both links
    await sendEmail({
      to: { email, name: `${firstName} ${lastName}` },
      subject: `Your ${serviceLabel} Application — Next Steps`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">Welcome, ${firstName}!</h2>
          <p style="color:#555;margin-top:0">Your consultant at <strong>${organization.name}</strong> has started your <strong>${serviceLabel}</strong> application.</p>

          <p>There are two things for you to complete:</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
            <tr>
              <td style="padding:16px;background:#f4f4f5;border-radius:8px;margin-bottom:12px">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#09090b">① Client Intake Portal</p>
                <p style="margin:0 0 12px;font-size:13px;color:#555">Review your document checklist, fill in your personal and immigration details, and upload your supporting documents.</p>
                <a href="${portal}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600">Open Intake Portal →</a>
                <p style="margin:8px 0 0;font-size:11px;color:#888">Or copy this link: ${portal}</p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
            <tr>
              <td style="padding:16px;background:#f4f4f5;border-radius:8px">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#09090b">② Service Agreement${fmtFee ? ` — ${fmtFee}` : ""}</p>
                <p style="margin:0 0 12px;font-size:13px;color:#555">Review and sign your retainer agreement with ${organization.name}. This takes less than 2 minutes.</p>
                <a href="${agreement}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600">Review & Sign Agreement →</a>
                <p style="margin:8px 0 0;font-size:11px;color:#888">Or copy this link: ${agreement}</p>
              </td>
            </tr>
          </table>

          <p style="font-size:13px;color:#555">If you have any questions, simply reply to this email or contact your consultant directly.</p>

          <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0"/>
          <p style="font-size:11px;color:#888;margin:0">${organization.name} · Immigration Consulting Services</p>
          <p style="font-size:11px;color:#aaa;margin:4px 0 0">These links expire in 60 days. Contact your consultant if you need a new link.</p>
        </div>
      `,
    }).catch(e => console.warn("Welcome email failed:", e));

    return NextResponse.json({
      clientId,
      caseId,
      agreementId,
      portalLink: portal,
      agreementLink: agreement,
    });
  } catch (err) {
    console.error("intake error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
