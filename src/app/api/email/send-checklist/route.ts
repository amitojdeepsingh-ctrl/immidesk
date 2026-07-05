// ═══════════════════════════════════════════════════════════════════════════
// POST /api/email/send-checklist
// ═══════════════════════════════════════════════════════════════════════════
// Sends a document checklist email to a client. Accepts a case ID and
// optional item indices to send specific items. If no indices are
// provided, all unsent required items are sent.
//
// Auth: Session required. Scoped to user's organization.
// Rate limit: 30/min (email sending is expensive).
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
  AppError,
} from "@/lib/api/errors";
import { sendChecklistEmail } from "@/lib/email/checklists";
import { nanoid } from "nanoid";

// ─── Validation Schema ─────────────────────────────────────────────────────

const sendChecklistSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  itemIndices: z.array(z.number().int().min(0)).max(50).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  /** Override the client portal token. If omitted, one is generated. */
  clientPortalToken: z.string().min(8).optional(),
});

export type SendChecklistInput = z.infer<typeof sendChecklistSchema>;

// ─── POST Handler ──────────────────────────────────────────────────────────

/**
 * POST /api/email/send-checklist
 *
 * Body (JSON):
 * {
 *   caseId: string (required),
 *   itemIndices?: number[] (optional — 0-based indices of checklist items to send),
 *   dueDate?: string (ISO 8601, optional),
 *   clientPortalToken?: string (optional — auto-generated if omitted)
 * }
 *
 * Returns: { data: SendChecklistResult, meta: null, error: null }
 */
export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const body = await req.json();
    const validated = sendChecklistSchema.parse(body);

    // Verify the case belongs to this organization
    const { data: caseRecord, error: caseError } = await supabase
      .from("Case")
      .select("*, client:Client!inner(id, firstName, lastName, email)")
      .eq("id", validated.caseId)
      .eq("organizationId", organization.id)
      .single();

    if (caseError || !caseRecord) {
      throw new AppError(
        "CASE_NOT_FOUND",
        "Case not found or does not belong to your organization",
        404,
      );
    }

    if (!caseRecord.client?.[0]) {
      throw new AppError(
        "CLIENT_NOT_FOUND",
        "This case has no associated client",
        400,
      );
    }

    const client = caseRecord.client[0];
    const clientName = `${client.firstName} ${client.lastName}`;

    // Generate or use provided client portal token
    const clientPortalToken =
      validated.clientPortalToken ?? nanoid(24);

    // Send the checklist email
    const result = await sendChecklistEmail({
      caseId: validated.caseId,
      clientEmail: client.email,
      clientName,
      consultantName: prismaUser.name,
      organizationName: organization.name,
      clientPortalToken,
      dueDate: validated.dueDate,
      itemIndices: validated.itemIndices,
    });

    if (!result.success) {
      return errorResponse(
        "EMAIL_SEND_FAILED",
        result.error ?? "Failed to send checklist email",
        result,
        502,
      );
    }

    // Log activity
    await supabase.from("ActivityLog").insert({
      organizationId: organization.id,
      userId: prismaUser.id,
      action: "CHECKLIST_EMAIL_SENT",
      entityType: "Case",
      entityId: validated.caseId,
      metadata: {
        clientName,
        clientEmail: client.email,
        sentCount: result.sentCount,
        messageId: result.emailResult?.messageId,
      },
    });

    return successResponse(
      {
        sentCount: result.sentCount,
        messageId: result.emailResult?.messageId,
        clientPortalToken,
      },
      200,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
