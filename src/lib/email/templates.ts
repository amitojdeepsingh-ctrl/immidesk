// ═══════════════════════════════════════════════════════════════════════════
// ImmigDesk — Email Templates
// ═══════════════════════════════════════════════════════════════════════════
// HTML email templates for all 9 transactional email triggers defined
// in the technical spec. Each template is a pure function that accepts
// typed data and returns a complete HTML document string.
//
// Templates are inlined (no React Email dependency) to keep the bundle
// lean. All styles are inline for maximum email client compatibility.
// ═══════════════════════════════════════════════════════════════════════════

import { APP_URL } from "./resend";
import { formatDate } from "@/lib/utils";

// ─── Shared Layout ─────────────────────────────────────────────────────────

interface EmailLayoutParams {
  preview: string;
  title: string;
  content: string;
  actionUrl?: string;
  actionLabel?: string;
  footerNote?: string;
}

function emailLayout(params: EmailLayoutParams): string {
  const actionBlock = params.actionUrl
    ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 24px auto;">
      <tr>
        <td align="center" style="border-radius: 6px; background-color: #2563eb;">
          <a href="${params.actionUrl}" target="_blank" rel="noopener"
             style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 15px; font-weight: 600; border-radius: 6px;">
            ${params.actionLabel ?? "View Details"}
          </a>
        </td>
      </tr>
    </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .content { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <span style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${params.preview}</span>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="container" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 0 8px; text-align: center;">
              <span style="font-size: 20px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">ImmigDesk</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="content" style="background-color: #ffffff; border-radius: 8px; padding: 32px 40px;
                       border: 1px solid #e5e7eb;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #111827; line-height: 1.3;">
                ${params.title}
              </h1>
              ${params.content}
              ${actionBlock}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 0; text-align: center; color: #6b7280; font-size: 13px; line-height: 1.6;">
              <p style="margin: 0 0 4px;">ImmigDesk — Immigration Case Management</p>
              ${params.footerNote ? `<p style="margin: 0;">${params.footerNote}</p>` : ""}
              <p style="margin: 12px 0 0;">
                <a href="${APP_URL}" style="color: #6b7280; text-decoration: underline;">${APP_URL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Shared Helpers ────────────────────────────────────────────────────────

function statusBadge(status: string, color: string): string {
  return `<span style="display: inline-block; padding: 3px 10px; border-radius: 12px;
    background-color: ${color}15; color: ${color}; font-size: 13px; font-weight: 600;">
    ${status}</span>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding: 6px 12px 6px 0; color: #6b7280; font-size: 14px; white-space: nowrap; vertical-align: top;">${label}</td>
    <td style="padding: 6px 0; color: #111827; font-size: 14px;">${value}</td>
  </tr>`;
}

function infoTable(rows: [string, string][]): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
    style="margin: 16px 0; background-color: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
    ${rows.map(([label, value]) => infoRow(label, value)).join("")}
  </table>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — Welcome Email (after signup)
// ═══════════════════════════════════════════════════════════════════════════

export interface WelcomeEmailData {
  userName: string;
  organizationName: string;
}

export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const subject = `Welcome to ImmigDesk, ${data.userName}!`;
  const html = emailLayout({
    preview: `Welcome to ImmigDesk — your immigration case management platform is ready.`,
    title: `Welcome, ${data.userName}!`,
    content: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Your organization <strong>${data.organizationName}</strong> has been set up on ImmigDesk.
        You're now ready to manage immigration cases, collect client documents, and fill IRCC forms — all in one place.
      </p>
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Here's what you can do right now:
      </p>
      <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 15px; color: #374151; line-height: 1.8;">
        <li>Add your first client and create a case</li>
        <li>Upload documents and organize them by category</li>
        <li>Fill IMM forms with auto-populated client data</li>
        <li>Generate service agreements and track signatures</li>
      </ul>
    `,
    actionUrl: `${APP_URL}/dashboard`,
    actionLabel: "Go to Dashboard",
    footerNote: "If you have questions, reply to this email — we read every message.",
  });

  return { subject, html };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — Client Intake Confirmation
// ═══════════════════════════════════════════════════════════════════════════

export interface ClientIntakeData {
  clientName: string;
  caseType: string;
  caseTitle: string;
  consultantName: string;
  organizationName: string;
  clientPortalToken?: string;
}

export function clientIntakeEmail(data: ClientIntakeData): { subject: string; html: string } {
  const subject = `Your immigration case has been opened — ${data.caseTitle}`;
  const portalUrl = data.clientPortalToken
    ? `${APP_URL}/client-portal/upload/${data.clientPortalToken}`
    : undefined;

  const html = emailLayout({
    preview: `Your ${data.caseType} case "${data.caseTitle}" has been opened with ${data.organizationName}.`,
    title: "Case Opened Successfully",
    content: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hello ${data.clientName}, your immigration case has been opened with <strong>${data.organizationName}</strong>.
        ${data.consultantName} will be your primary point of contact.
      </p>
      ${infoTable([
        ["Case Type", data.caseType],
        ["Case Title", data.caseTitle],
        ["Consultant", data.consultantName],
        ["Organization", data.organizationName],
      ])}
      <p style="margin: 16px 0 0; font-size: 15px; color: #374151; line-height: 1.6;">
        The next step is document collection. You'll receive a separate email with a secure upload link
        where you can submit your documents directly.
      </p>
    `,
    actionUrl: portalUrl,
    actionLabel: portalUrl ? "Upload Documents" : undefined,
    footerNote: "Please do not share your upload link with anyone else.",
  });

  return { subject, html };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — Document Request to Client
// ═══════════════════════════════════════════════════════════════════════════

export interface DocumentRequestData {
  clientName: string;
  caseTitle: string;
  consultantName: string;
  organizationName: string;
  requestedDocuments: { category: string; description: string }[];
  clientPortalToken: string;
  dueDate?: Date | string;
}

export function documentRequestEmail(data: DocumentRequestData): { subject: string; html: string } {
  const dueLabel = data.dueDate ? ` by ${formatDate(data.dueDate)}` : "";
  const subject = `Documents needed for your case: ${data.caseTitle}`;

  const docList = data.requestedDocuments
    .map(
      (d) =>
        `<li style="margin-bottom: 6px;"><strong>${d.category}:</strong> ${d.description}</li>`,
    )
    .join("");

  const html = emailLayout({
    preview: `${data.organizationName} needs ${data.requestedDocuments.length} document(s) for your case${dueLabel}.`,
    title: "Documents Required",
    content: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hello ${data.clientName}, we need the following documents for your case
        <strong>${data.caseTitle}</strong>${dueLabel}:
      </p>
      <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 15px; color: #374151; line-height: 1.8;">
        ${docList}
      </ul>
      <p style="margin: 16px 0 0; font-size: 15px; color: #374151; line-height: 1.6;">
        Use the secure upload link below to submit your documents. Accepted formats: PDF, JPG, PNG (max 10 MB per file).
      </p>
    `,
    actionUrl: `${APP_URL}/client-portal/upload/${data.clientPortalToken}`,
    actionLabel: "Upload Documents Securely",
    footerNote: `Questions? Contact ${data.consultantName} at your organization.`,
  });

  return { subject, html };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 4 — Document Received Confirmation
// ═══════════════════════════════════════════════════════════════════════════

export interface DocumentReceivedData {
  clientName: string;
  caseTitle: string;
  documentName: string;
  documentCategory: string;
  receivedAt: Date | string;
  consultantName: string;
}

export function documentReceivedEmail(data: DocumentReceivedData): { subject: string; html: string } {
  const subject = `Document received: ${data.documentName} — ${data.caseTitle}`;

  const html = emailLayout({
    preview: `We've received "${data.documentName}" (${data.documentCategory}) for your case ${data.caseTitle}.`,
    title: "Document Received",
    content: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hello ${data.clientName}, we've successfully received your document:
      </p>
      ${infoTable([
        ["Document", data.documentName],
        ["Category", data.documentCategory],
        ["Case", data.caseTitle],
        ["Received", formatDate(data.receivedAt)],
      ])}
      <p style="margin: 16px 0 0; font-size: 15px; color: #374151; line-height: 1.6;">
        ${data.consultantName} will review it shortly. We'll reach out if anything else is needed.
      </p>
    `,
    footerNote: "Keep this email for your records.",
  });

  return { subject, html };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 5 — Form Submission Confirmation
// ═══════════════════════════════════════════════════════════════════════════

export interface FormSubmissionData {
  clientName: string;
  caseTitle: string;
  formCode: string;
  formName: string;
  submittedAt: Date | string;
  irccApplicationNumber?: string;
  consultantName: string;
  organizationName: string;
}

export function formSubmissionEmail(data: FormSubmissionData): { subject: string; html: string } {
  const subject = `Form ${data.formCode} submitted — ${data.caseTitle}`;

  const html = emailLayout({
    preview: `IMM ${data.formCode} (${data.formName}) has been submitted for your case ${data.caseTitle}.`,
    title: "Form Submitted to IRCC",
    content: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hello ${data.clientName}, your immigration form has been submitted to IRCC:
      </p>
      ${infoTable([
        ["Form", `IMM ${data.formCode} — ${data.formName}`],
        ["Case", data.caseTitle],
        ["Submitted", formatDate(data.submittedAt)],
        ...(data.irccApplicationNumber ? [["IRCC App #", data.irccApplicationNumber] as [string, string]] : []),
        ["Submitted by", `${data.consultantName} (${data.organizationName})`],
      ])}
      <p style="margin: 16px 0 0; font-size: 15px; color: #374151; line-height: 1.6;">
        IRCC processing times vary by program. ${data.consultantName} will notify you
        as soon as there's an update on your application.
      </p>
    `,
    footerNote: "This is an automated confirmation. Do not reply to this email for case-specific questions.",
  });

  return { subject, html };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 6 — Deadline Reminder (3 days before)
// ═══════════════════════════════════════════════════════════════════════════

export interface DeadlineReminderData {
  clientName: string;
  caseTitle: string;
  deadlineType: string;
  deadlineDate: Date | string;
  daysRemaining: number;
  actionRequired: string;
  consultantName: string;
  clientPortalToken?: string;
}

export function deadlineReminderEmail(data: DeadlineReminderData): { subject: string; html: string } {
  const urgencyColor = data.daysRemaining <= 1 ? "#dc2626" : "#d97706";
  const subject = `Reminder: ${data.deadlineType} due in ${data.daysRemaining} day${data.daysRemaining === 1 ? "" : "s"} — ${data.caseTitle}`;

  const html = emailLayout({
    preview: `Your ${data.deadlineType} for case ${data.caseTitle} is due in ${data.daysRemaining} day${data.daysRemaining === 1 ? "" : "s"}.`,
    title: `Deadline Approaching`,
    content: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hello ${data.clientName}, this is a reminder that the following deadline is approaching:
      </p>
      ${infoTable([
        ["Deadline", data.deadlineType],
        ["Due Date", formatDate(data.deadlineDate)],
        ["Days Left", `${statusBadge(`${data.daysRemaining} day${data.daysRemaining === 1 ? "" : "s"}`, urgencyColor)}`],
        ["Action Needed", data.actionRequired],
        ["Case", data.caseTitle],
      ])}
      <p style="margin: 16px 0 0; font-size: 15px; color: #374151; line-height: 1.6;">
        Please complete this as soon as possible to avoid delays in your application.
        Contact ${data.consultantName} if you need assistance.
      </p>
    `,
    actionUrl: data.clientPortalToken
      ? `${APP_URL}/client-portal/upload/${data.clientPortalToken}`
      : undefined,
    actionLabel: data.clientPortalToken ? "Take Action Now" : undefined,
    footerNote: "Missing deadlines can delay your immigration application.",
  });

  return { subject, html };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 7 — Deadline Missed Alert (internal + client)
// ═══════════════════════════════════════════════════════════════════════════

export interface DeadlineMissedData {
  clientName: string;
  caseTitle: string;
  deadlineType: string;
  deadlineDate: Date | string;
  consultantName: string;
  organizationName: string;
  impactDescription: string;
  nextSteps: string;
}

export function deadlineMissedEmail(data: DeadlineMissedData): { subject: string; html: string } {
  const subject = `URGENT: ${data.deadlineType} deadline missed — ${data.caseTitle}`;

  const html = emailLayout({
    preview: `The ${data.deadlineType} deadline for case ${data.caseTitle} was missed on ${formatDate(data.deadlineDate)}.`,
    title: "Deadline Missed",
    content: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hello ${data.clientName}, the following deadline for your case has passed:
      </p>
      ${infoTable([
        ["Deadline", data.deadlineType],
        ["Was Due", formatDate(data.deadlineDate)],
        ["Case", data.caseTitle],
        ["Impact", data.impactDescription],
      ])}
      <p style="margin: 16px 0 0; font-size: 15px; color: #374151; line-height: 1.6;">
        <strong>Next steps:</strong> ${data.nextSteps}
      </p>
      <p style="margin: 12px 0 0; font-size: 15px; color: #374151; line-height: 1.6;">
        ${data.consultantName} from ${data.organizationName} will reach out to discuss how to proceed.
        Please respond promptly to minimize any negative impact on your application.
      </p>
    `,
    footerNote: "Time-sensitive — please respond as soon as possible.",
  });

  return { subject, html };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 8 — Case Status Update
// ═══════════════════════════════════════════════════════════════════════════

export interface CaseStatusUpdateData {
  clientName: string;
  caseTitle: string;
  previousStatus: string;
  newStatus: string;
  statusDescription: string;
  updatedAt: Date | string;
  consultantName: string;
  organizationName: string;
  additionalNotes?: string;
}

export function caseStatusUpdateEmail(data: CaseStatusUpdateData): { subject: string; html: string } {
  const subject = `Case update: ${data.caseTitle} — ${data.newStatus}`;

  const notesBlock = data.additionalNotes
    ? `<p style="margin: 16px 0 0; padding: 12px 16px; background-color: #f0f9ff; border-left: 3px solid #2563eb;
          border-radius: 0 6px 6px 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
        <strong>Note from ${data.consultantName}:</strong><br>${data.additionalNotes}
      </p>`
    : "";

  const html = emailLayout({
    preview: `Your case ${data.caseTitle} has moved from ${data.previousStatus} to ${data.newStatus}.`,
    title: "Case Status Updated",
    content: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hello ${data.clientName}, the status of your immigration case has been updated:
      </p>
      ${infoTable([
        ["Case", data.caseTitle],
        ["Previous Status", data.previousStatus],
        ["New Status", `${statusBadge(data.newStatus, "#2563eb")}`],
        ["What This Means", data.statusDescription],
        ["Updated", formatDate(data.updatedAt)],
      ])}
      ${notesBlock}
      <p style="margin: 16px 0 0; font-size: 15px; color: #374151; line-height: 1.6;">
        ${data.consultantName} at ${data.organizationName} is managing your case.
        You'll receive another update when the status changes again.
      </p>
    `,
    footerNote: "This is an automated status notification.",
  });

  return { subject, html };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 9 — Agreement Ready for Signature
// ═══════════════════════════════════════════════════════════════════════════

export interface AgreementSignatureData {
  clientName: string;
  agreementTitle: string;
  serviceType: string;
  feeAmount: number;
  feeCurrency: string;
  consultantName: string;
  organizationName: string;
  signingUrl: string;
  expiresAt?: Date | string;
}

export function agreementSignatureEmail(data: AgreementSignatureData): { subject: string; html: string } {
  const subject = `Service agreement ready for signature — ${data.agreementTitle}`;
  const expiryNote = data.expiresAt
    ? `<p style="margin: 12px 0 0; font-size: 14px; color: #d97706; line-height: 1.6;">
         This agreement link expires on ${formatDate(data.expiresAt)}. Please sign before then.
       </p>`
    : "";

  const html = emailLayout({
    preview: `${data.organizationName} has sent you a service agreement to review and sign.`,
    title: "Agreement Ready for Signature",
    content: `
      <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hello ${data.clientName}, ${data.organizationName} has prepared a service agreement for your review:
      </p>
      ${infoTable([
        ["Agreement", data.agreementTitle],
        ["Service", data.serviceType],
        ["Fee", `${data.feeCurrency} ${data.feeAmount.toLocaleString()}`],
        ["Prepared by", `${data.consultantName} (${data.organizationName})`],
      ])}
      <p style="margin: 16px 0 0; font-size: 15px; color: #374151; line-height: 1.6;">
        Click the button below to review and sign the agreement. Your electronic signature
        is legally binding under applicable e-signature laws.
      </p>
      ${expiryNote}
    `,
    actionUrl: data.signingUrl,
    actionLabel: "Review & Sign Agreement",
    footerNote: "If you have questions about the terms, contact your consultant before signing.",
  });

  return { subject, html };
}

// ═══════════════════════════════════════════════════════════════════════════
// Template Registry — Map trigger names to template functions
// ═══════════════════════════════════════════════════════════════════════════

export type EmailTrigger =
  | "welcome"
  | "client_intake"
  | "document_request"
  | "document_received"
  | "form_submission"
  | "deadline_reminder"
  | "deadline_missed"
  | "case_status_update"
  | "agreement_signature";

interface EmailTemplateData {
  clientName?: string;
  clientEmail?: string;
  caseTitle?: string;
  caseId?: string;
  documentName?: string;
  documentCategory?: string;
  formName?: string;
  deadlineDate?: string;
  daysUntilDeadline?: number;
  newStatus?: string;
  agreementTitle?: string;
  organizationName?: string;
  [key: string]: string | number | boolean | undefined;
}

type EmailTemplateFn = (data: Record<string, unknown>) => { subject: string; html: string };

export const emailTemplates: Record<EmailTrigger, EmailTemplateFn> = {
  welcome: welcomeEmail as unknown as EmailTemplateFn,
  client_intake: clientIntakeEmail as unknown as EmailTemplateFn,
  document_request: documentRequestEmail as unknown as EmailTemplateFn,
  document_received: documentReceivedEmail as unknown as EmailTemplateFn,
  form_submission: formSubmissionEmail as unknown as EmailTemplateFn,
  deadline_reminder: deadlineReminderEmail as unknown as EmailTemplateFn,
  deadline_missed: deadlineMissedEmail as unknown as EmailTemplateFn,
  case_status_update: caseStatusUpdateEmail as unknown as EmailTemplateFn,
  agreement_signature: agreementSignatureEmail as unknown as EmailTemplateFn,
};
