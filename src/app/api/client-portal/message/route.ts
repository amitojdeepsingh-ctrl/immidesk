import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyPortalToken } from "@/lib/portal-token";
import { sendEmail } from "@/lib/email/resend";

export async function POST(req: NextRequest) {
  try {
    const { token, caseId, content } = await req.json();
    if (!token || !caseId || !content?.trim()) {
      return NextResponse.json({ error: "token, caseId, content required" }, { status: 400 });
    }

    const payload = verifyPortalToken(token);
    if (!payload || payload.caseId !== caseId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const db = getSupabaseAdmin();

    // Fetch client name for the message
    const { data: client } = await db
      .from("Client")
      .select("firstName, lastName, email")
      .eq("id", payload.clientId)
      .single();

    const senderName = client ? `${client.firstName} ${client.lastName}` : "Client";

    const { data: message, error } = await db.from("PortalMessage").insert({
      organizationId: payload.organizationId,
      caseId,
      clientId: payload.clientId,
      content: content.trim(),
      sentByClient: true,
      senderName,
    }).select().single();

    if (error) throw error;

    // Notify RCIC by email
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
        subject: `💬 New message from ${senderName}`,
        html: `
          <p>Hi ${rcicUser.name},</p>
          <p><strong>${senderName}</strong> sent a message through their client portal:</p>
          <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;">${content.trim()}</blockquote>
          <p>Log in to ImmigDesk to view and reply.</p>
          <p>— ImmigDesk</p>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({ message });
  } catch (err) {
    console.error("portal/message error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
