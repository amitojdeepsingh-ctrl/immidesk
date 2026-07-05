import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { CASE_TYPE_LABELS } from "@/lib/checklists";

export async function POST(req: NextRequest) {
  try {
    const { organization, prismaUser } = await requireAuth();
    const { subject, body, caseType } = await req.json();
    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "subject and body required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Fetch matching clients (exclude leads — only send to paid clients)
    let query = db.from("Client").select("firstName, lastName, email, tags").eq("organizationId", organization.id);

    if (caseType && caseType !== "ALL") {
      // Join via Case table — get clientIds that have a case of this type
      const { data: matchingCases } = await db
        .from("Case")
        .select("clientId")
        .eq("organizationId", organization.id)
        .eq("caseType", caseType);
      const clientIds = [...new Set((matchingCases ?? []).map((c: { clientId: string }) => c.clientId))];
      if (clientIds.length === 0) return NextResponse.json({ sent: 0 });
      query = query.in("id", clientIds);
    }

    const { data: allContacts } = await query;
    // Filter out leads — only paid clients receive newsletters
    const clients = (allContacts ?? []).filter((c: { tags: string[] }) => !(c.tags ?? []).includes("lead"));
    if (!clients || clients.length === 0) return NextResponse.json({ sent: 0 });

    const typeLabel = caseType && caseType !== "ALL" ? CASE_TYPE_LABELS[caseType] ?? caseType : "All Applications";
    const htmlBody = body.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Build branded ADS Immigration email
    function buildNewsEmail(firstName: string): string {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;">

        <!-- Header: ADS Navy -->
        <tr>
          <td style="background:#0f2d5c;border-radius:8px 8px 0 0;padding:24px 32px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">ADS Immigration Services</div>
            <div style="font-size:12px;color:#93afd4;margin-top:4px;letter-spacing:0.5px;">RCIC · Regulated Canadian Immigration Consultant</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px 40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Dear ${firstName},</p>
            <div style="font-size:15px;color:#374151;line-height:1.7;">${htmlBody}</div>

            <!-- CTA -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:28px 0 0;">
              <tr>
                <td style="background:#f0f5ff;border-radius:8px;padding:20px 24px;border:1px solid #c7d8f8;">
                  <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0f2d5c;">Have questions about this update?</p>
                  <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
                    Every immigration situation is unique. Book a free 15-minute call with our team to find out how this affects your application.
                  </p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="border-radius:6px;background:#0f2d5c;margin-right:8px;">
                        <a href="tel:+1-XXX-XXX-XXXX" style="display:inline-block;padding:10px 20px;color:#fff;text-decoration:none;font-size:14px;font-weight:600;">
                          📞 Call Us
                        </a>
                      </td>
                      <td width="8"></td>
                      <td style="border-radius:6px;background:#ffffff;border:1px solid #0f2d5c;">
                        <a href="mailto:amitoj.deep.singh@gmail.com?subject=Immigration Inquiry" style="display:inline-block;padding:10px 20px;color:#0f2d5c;text-decoration:none;font-size:14px;font-weight:600;">
                          ✉️ Email Us
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Signature -->
        <tr>
          <td style="background:#ffffff;padding:0 40px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;"/>
            <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f2d5c;">Amitoj Singh</p>
            <p style="margin:0 0 2px;font-size:13px;color:#6b7280;">Regulated Canadian Immigration Consultant (RCIC)</p>
            <p style="margin:0 0 2px;font-size:13px;color:#6b7280;">ADS Immigration Services</p>
            <p style="margin:0;font-size:13px;color:#6b7280;">
              <a href="mailto:amitoj.deep.singh@gmail.com" style="color:#0f2d5c;text-decoration:none;">amitoj.deep.singh@gmail.com</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-radius:0 0 8px 8px;padding:16px 32px;text-align:center;border:1px solid #e5e7eb;border-top:none;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              This update is from <strong>ADS Immigration Services</strong> regarding your ${typeLabel} application.<br/>
              You are receiving this because you are a client of ADS Immigration Services.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    // sequential send — switch to Resend batch API when volume > 50/day
    let sent = 0;
    for (const client of clients) {
      const result = await sendEmail({
        to: { email: client.email, name: `${client.firstName} ${client.lastName}` },
        subject,
        html: buildNewsEmail(client.firstName),
      });
      if (result.success) sent++;
    }

    // Log
    await db.from("ActivityLog").insert({
      organizationId: organization.id,
      userId: prismaUser.id,
      action: "NEWSLETTER_SENT",
      entityType: "Organization",
      entityId: organization.id,
      metadata: { subject, caseType: caseType ?? "ALL", sent, total: clients.length },
    });

    return NextResponse.json({ sent, total: clients.length });
  } catch (err) {
    console.error("newsletter/send:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
