import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { organization } = await requireAuth();
  const { leadId } = await params;
  const body = await req.json(); // { subject, html, senderName }
  const db = getSupabaseAdmin();

  const { data: lead, error: fetchErr } = await db
    .from("LmiaLead")
    .select("*")
    .eq("id", leadId)
    .eq("organizationId", organization.id)
    .single();

  if (fetchErr || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (!lead.email) {
    return NextResponse.json({ error: "Lead has no email address" }, { status: 400 });
  }

  const result = await sendEmail({
    to: { email: lead.email, name: lead.contactName ?? lead.companyName },
    subject: body.subject,
    html: body.html,
    tags: [
      { name: "category", value: "lmia-outreach" },
      { name: "leadId", value: leadId },
    ],
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Mark lead as contacted
  await db
    .from("LmiaLead")
    .update({ status: "CONTACTED", emailSentAt: new Date().toISOString() })
    .eq("id", leadId)
    .eq("organizationId", organization.id);

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
