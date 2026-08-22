import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generatePortalToken, generateAgreementToken, portalUrl, agreementUrl, intakeUrl, uploadUrl } from "@/lib/portal-token";
import { CASE_TYPE_LABELS } from "@/lib/checklists";
import { sendEmail, orgSender } from "@/lib/email/resend";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organization } = await requireAuth();
    const { id: clientId } = await params;

    const db = getSupabaseAdmin();

    // Fetch client
    const { data: client } = await db
      .from("Client")
      .select("id, firstName, lastName, email")
      .eq("organizationId", organization.id)
      .eq("id", clientId)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Fetch most recent case
    const { data: cases } = await db
      .from("Case")
      .select("id, caseType")
      .eq("organizationId", organization.id)
      .eq("clientId", clientId)
      .order("createdAt", { ascending: false })
      .limit(1);

    if (!cases || cases.length === 0) {
      return NextResponse.json({ error: "No case found for this client" }, { status: 400 });
    }

    const c = cases[0];

    // Fetch most recent agreement for this case
    const { data: agreements } = await db
      .from("ServiceAgreement")
      .select("id")
      .eq("organizationId", organization.id)
      .eq("clientId", clientId)
      .eq("caseId", c.id)
      .order("createdAt", { ascending: false })
      .limit(1);

    if (!agreements || agreements.length === 0) {
      return NextResponse.json({ error: "No service agreement found for this client" }, { status: 400 });
    }

    const agreementId = agreements[0].id;

    // Generate fresh 60-day tokens (links resolve against the live origin)
    const origin = new URL(req.url).origin;
    const portalToken = generatePortalToken(clientId, c.id, organization.id, 60);
    const agToken = generateAgreementToken(agreementId, clientId, organization.id, 60);
    const portal = portalUrl(portalToken, origin);
    const intake = intakeUrl(portalToken, origin);
    const upload = uploadUrl(portalToken, origin);
    const agreement = agreementUrl(agToken, origin);
    const serviceLabel = CASE_TYPE_LABELS[c.caseType] ?? c.caseType;

    const result = await sendEmail({
      ...orgSender({ name: organization.name, email: (organization as unknown as { email?: string | null }).email ?? undefined, settings: organization.settings }),
      to: { email: client.email, name: `${client.firstName} ${client.lastName}` },
      subject: `Your ${serviceLabel} Application — Links & Next Steps`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">Hi ${client.firstName},</h2>
          <p style="color:#555;margin-top:0">Your consultant at <strong>${organization.name}</strong> has sent you updated links for your <strong>${serviceLabel}</strong> application.</p>

          <p>Please complete the following:</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
            <tr>
              <td style="padding:16px;background:#f4f4f5;border-radius:8px;margin-bottom:12px">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#09090b">① Personal Information Sheet</p>
                <p style="margin:0 0 12px;font-size:13px;color:#555">Fill out your secure online information form. If you have a spouse, common-law partner, or dependent children, you can enter their details in the same form.</p>
                <a href="${intake}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600">Complete Information Sheet &rarr;</a>
                <p style="margin:8px 0 0;font-size:11px;color:#888">Or copy this link: ${intake}</p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
            <tr>
              <td style="padding:16px;background:#f4f4f5;border-radius:8px;margin-bottom:12px">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#09090b">② Upload Your Documents</p>
                <p style="margin:0 0 12px;font-size:13px;color:#555">Upload passports, IDs, and supporting documents through your secure document portal — return anytime to add more.</p>
                <a href="${upload}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600">Open Document Upload &rarr;</a>
                <p style="margin:8px 0 0;font-size:11px;color:#888">Or copy this link: ${upload}</p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
            <tr>
              <td style="padding:16px;background:#f4f4f5;border-radius:8px">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#09090b">③ Service Agreement</p>
                <p style="margin:0 0 12px;font-size:13px;color:#555">If you have not yet signed, review and sign your retainer agreement with ${organization.name}. This takes less than 2 minutes.</p>
                <a href="${agreement}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600">Review &amp; Sign Agreement &rarr;</a>
                <p style="margin:8px 0 0;font-size:11px;color:#888">Or copy this link: ${agreement}</p>
              </td>
            </tr>
          </table>

          <p style="font-size:13px;color:#555">Your full client portal is also available here: <a href="${portal}" style="color:#555">${portal}</a></p>
          <p style="font-size:13px;color:#555">If you have any questions, simply reply to this email or contact your consultant directly.</p>

          <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0"/>
          <p style="font-size:11px;color:#888;margin:0">${organization.name} · Immigration Consulting Services</p>
          <p style="font-size:11px;color:#aaa;margin:4px 0 0">These links expire in 60 days. Contact your consultant if you need a new link.</p>
        </div>
      `,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Email send failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("resend-links error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
