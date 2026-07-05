import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
  AppError,
} from "@/lib/api/errors";
import { z } from "zod";
import { sendEmailBatch } from "@/lib/email/resend";
import type { EmailRecipient } from "@/lib/email/resend";

const notifySchema = z.object({
  drawId: z.string().min(1, "Draw ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const body = await req.json();
    const { drawId } = notifySchema.parse(body);

    const { data: draw, error: drawError } = await supabase
      .from("PNPDraw")
      .select("*")
      .eq("id", drawId)
      .single();
    if (drawError || !draw) {
      return errorResponse("NOT_FOUND", "Draw not found", null, 404);
    }

    const { data: cases, error: casesError } = await supabase
      .from("Case")
      .select("*, client:Client!inner(id, firstName, lastName, email)")
      .eq("organizationId", organization.id)
      .eq("caseType", "PNP");
    if (casesError) {
      return errorResponse("FETCH_ERROR", "Failed to fetch cases", null, 500);
    }

    const recipients: EmailRecipient[] = (cases || [])
      .filter((c) => c.client?.[0]?.email)
      .map((c) => ({
        email: c.client[0].email,
        name: `${c.client[0].firstName} ${c.client[0].lastName}`,
      }))
      .filter(
        (r, i, arr) => arr.findIndex((x) => x.email === r.email) === i,
      );

    if (recipients.length === 0) {
      return successResponse({ notifiedCount: 0 }, 200);
    }

    const subject = `New PNP Draw: ${draw.province} — ${draw.drawType} (Score: ${draw.minimumScore ?? "N/A"})`;
    const html = `
      <h2 style="margin: 0 0 16px; font-size: 18px;">New PNP Draw — ${draw.province}</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Province</td><td style="padding: 6px 0;">${draw.province}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Date</td><td style="padding: 6px 0;">${new Date(draw.drawDate).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Type</td><td style="padding: 6px 0;">${draw.drawType}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Stream</td><td style="padding: 6px 0;">${draw.stream ?? "General"}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Minimum Score</td><td style="padding: 6px 0;">${draw.minimumScore ?? "N/A"}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #6b7280;">Invitations</td><td style="padding: 6px 0;">${draw.invitationsIssued.toLocaleString()}</td></tr>
      </table>
      <p style="margin: 12px 0 0; color: #374151;">Your ${organization.name} team is monitoring this draw. Contact your consultant if you have questions.</p>
    `;

    const results = await sendEmailBatch({
      to: recipients,
      subject,
      html,
      tags: [
        { name: "trigger", value: "pnp_draw_notification" },
        { name: "drawId", value: draw.id },
        { name: "organizationId", value: organization.id },
      ],
    });

    const notifiedCount = results.filter((r) => r.result.success).length;

    await supabase.from("ActivityLog").insert({
      organizationId: organization.id,
      userId: prismaUser.id,
      action: "PNP_DRAW_NOTIFIED",
      entityType: "PNPDraw",
      entityId: draw.id,
      metadata: {
        province: draw.province,
        drawType: draw.drawType,
        notifiedCount,
        totalRecipients: recipients.length,
        failedCount: results.filter((r) => !r.result.success).length,
      },
    });

    return successResponse({ notifiedCount }, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
