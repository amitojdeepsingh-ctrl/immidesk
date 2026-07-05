// ═══════════════════════════════════════════════════════════════════════════
// POST /api/email/send-submission-update
// ═══════════════════════════════════════════════════════════════════════════
// Sends a form submission status update email to a client. Supports
// multiple trigger types: form_submission, case_status_update, and
// deadline_reminder. The route determines which template to use based
// on the trigger field in the request body.
//
// Auth: Session required. Scoped to user's organization.
// Rate limit: 30/min.
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
import { sendEmail } from "@/lib/email/resend";
import {
  formSubmissionEmail,
  caseStatusUpdateEmail,
  deadlineReminderEmail,
  deadlineMissedEmail,
  type FormSubmissionData,
  type CaseStatusUpdateData,
  type DeadlineReminderData,
  type DeadlineMissedData,
} from "@/lib/email/templates";

// ─── Validation Schemas ────────────────────────────────────────────────────

const formSubmissionBodySchema = z.object({
  trigger: z.literal("form_submission"),
  caseId: z.string().min(1),
  formCode: z.string().min(1).max(20),
  formName: z.string().min(1).max(200),
  irccApplicationNumber: z.string().max(50).optional(),
});

const caseStatusUpdateBodySchema = z.object({
  trigger: z.literal("case_status_update"),
  caseId: z.string().min(1),
  previousStatus: z.string().min(1).max(100),
  newStatus: z.string().min(1).max(100),
  statusDescription: z.string().min(1).max(2000),
  additionalNotes: z.string().max(5000).optional(),
});

const deadlineReminderBodySchema = z.object({
  trigger: z.literal("deadline_reminder"),
  caseId: z.string().min(1),
  deadlineType: z.string().min(1).max(200),
  deadlineDate: z.string().datetime({ offset: true }),
  daysRemaining: z.number().int().min(0).max(365),
  actionRequired: z.string().min(1).max(1000),
});

const deadlineMissedBodySchema = z.object({
  trigger: z.literal("deadline_missed"),
  caseId: z.string().min(1),
  deadlineType: z.string().min(1).max(200),
  deadlineDate: z.string().datetime({ offset: true }),
  impactDescription: z.string().min(1).max(2000),
  nextSteps: z.string().min(1).max(2000),
});

const sendSubmissionUpdateSchema = z.discriminatedUnion("trigger", [
  formSubmissionBodySchema,
  caseStatusUpdateBodySchema,
  deadlineReminderBodySchema,
  deadlineMissedBodySchema,
]);

export type SendSubmissionUpdateInput = z.infer<typeof sendSubmissionUpdateSchema>;

// ─── POST Handler ──────────────────────────────────────────────────────────

/**
 * POST /api/email/send-submission-update
 *
 * Sends a status update email to a client based on the trigger type.
 * The route loads the case + client from the database, builds the
 * appropriate email template, and sends via Resend.
 *
 * Body (JSON) — discriminated union on "trigger":
 *
 * trigger: "form_submission"
 *   caseId, formCode, formName, irccApplicationNumber?
 *
 * trigger: "case_status_update"
 *   caseId, previousStatus, newStatus, statusDescription, additionalNotes?
 *
 * trigger: "deadline_reminder"
 *   caseId, deadlineType, deadlineDate, daysRemaining, actionRequired
 *
 * trigger: "deadline_missed"
 *   caseId, deadlineType, deadlineDate, impactDescription, nextSteps
 */
export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const body = await req.json();
    const validated = sendSubmissionUpdateSchema.parse(body);

    // Load case with client — verify org ownership
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

    // Build email based on trigger type
    let subject: string;
    let html: string;
    let triggerTag: string;

    switch (validated.trigger) {
      case "form_submission": {
        const data: FormSubmissionData = {
          clientName,
          caseTitle: caseRecord.title,
          formCode: validated.formCode,
          formName: validated.formName,
          submittedAt: new Date().toISOString(),
          irccApplicationNumber: validated.irccApplicationNumber,
          consultantName: prismaUser.name,
          organizationName: organization.name,
        };
        ({ subject, html } = formSubmissionEmail(data));
        triggerTag = "form_submission";
        break;
      }

      case "case_status_update": {
        const data: CaseStatusUpdateData = {
          clientName,
          caseTitle: caseRecord.title,
          previousStatus: validated.previousStatus,
          newStatus: validated.newStatus,
          statusDescription: validated.statusDescription,
          updatedAt: new Date().toISOString(),
          consultantName: prismaUser.name,
          organizationName: organization.name,
          additionalNotes: validated.additionalNotes,
        };
        ({ subject, html } = caseStatusUpdateEmail(data));
        triggerTag = "case_status_update";
        break;
      }

      case "deadline_reminder": {
        const data: DeadlineReminderData = {
          clientName,
          caseTitle: caseRecord.title,
          deadlineType: validated.deadlineType,
          deadlineDate: validated.deadlineDate,
          daysRemaining: validated.daysRemaining,
          actionRequired: validated.actionRequired,
          consultantName: prismaUser.name,
        };
        ({ subject, html } = deadlineReminderEmail(data));
        triggerTag = "deadline_reminder";
        break;
      }

      case "deadline_missed": {
        const data: DeadlineMissedData = {
          clientName,
          caseTitle: caseRecord.title,
          deadlineType: validated.deadlineType,
          deadlineDate: validated.deadlineDate,
          consultantName: prismaUser.name,
          organizationName: organization.name,
          impactDescription: validated.impactDescription,
          nextSteps: validated.nextSteps,
        };
        ({ subject, html } = deadlineMissedEmail(data));
        triggerTag = "deadline_missed";
        break;
      }

      default:
        throw new AppError(
          "INVALID_TRIGGER",
          "Unknown email trigger type",
          400,
        );
    }

    // Send the email
    const emailResult = await sendEmail({
      to: { email: client.email, name: clientName },
      subject,
      html,
      tags: [
        { name: "trigger", value: triggerTag },
        { name: "case_id", value: validated.caseId },
        { name: "client_id", value: client.id },
      ],
    });

    if (!emailResult.success) {
      return errorResponse(
        "EMAIL_SEND_FAILED",
        emailResult.error ?? "Failed to send submission update email",
        emailResult,
        502,
      );
    }

    // Log activity
    await supabase.from("ActivityLog").insert({
      organizationId: organization.id,
      userId: prismaUser.id,
      action: "SUBMISSION_UPDATE_EMAIL_SENT",
      entityType: "Case",
      entityId: validated.caseId,
      metadata: {
        clientName,
        clientEmail: client.email,
        trigger: triggerTag,
        messageId: emailResult.messageId,
      },
    });

    return successResponse(
      {
        trigger: triggerTag,
        messageId: emailResult.messageId,
        recipient: client.email,
      },
      200,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
