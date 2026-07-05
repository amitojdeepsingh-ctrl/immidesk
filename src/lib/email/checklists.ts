// ═══════════════════════════════════════════════════════════════════════════
// ImmigDesk — Email Checklist Engine
// ═══════════════════════════════════════════════════════════════════════════
// Builds document checklists per case type, sends checklist emails to
// clients, and tracks sent/completed status. Integrates with the
// document_request email template and the Resend client.
//
// Each CaseType has a predefined document checklist. When a case is
// created, the checklist is built automatically. Consultants can
// customize the checklist per case and trigger email sends for
// individual items or the entire checklist.
//
// Tracking: sent status is tracked via ActivityLog entries with
// action "CHECKLIST_ITEM_SENT". received status is derived from
// Document records matching the category.
// ═══════════════════════════════════════════════════════════════════════════

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail, type SendEmailResult } from "./resend";
import { documentRequestEmail, type DocumentRequestData } from "./templates";
import type { CaseType, DocumentCategory } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  category: DocumentCategory;
  description: string;
  required: boolean;
  sent: boolean;
  sentAt: Date | null;
  received: boolean;
  receivedAt: Date | null;
}

export interface CaseChecklist {
  caseId: string;
  caseType: CaseType;
  items: ChecklistItem[];
  lastSentAt: Date | null;
}

export interface SendChecklistParams {
  caseId: string;
  clientEmail: string;
  clientName: string;
  consultantName: string;
  organizationName: string;
  clientPortalToken: string;
  dueDate?: Date | string;
  /** Specific item indices to send (0-based). Omit to send all unsent items. */
  itemIndices?: number[];
}

export interface SendChecklistResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  emailResult?: SendEmailResult;
  error?: string;
}

// ─── Default Checklists by Case Type ──────────────────────────────────────

const DEFAULT_CHECKLISTS: Record<CaseType, Omit<ChecklistItem, "sent" | "sentAt" | "received" | "receivedAt">[]> = {
  EXPRESS_ENTRY: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "LANGUAGE_TEST", description: "IELTS/CELPIP language test results", required: true },
    { category: "EDUCATION", description: "ECA report (WES/ICES/etc.) + degree certificates", required: true },
    { category: "WORK_EXPERIENCE", description: "Reference letters for all claimed work experience", required: true },
    { category: "POLICE_CERTIFICATE", description: "Police clearance from all countries lived in 6+ months", required: true },
    { category: "MEDICAL", description: "Upfront medical exam results (IME)", required: true },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "FINANCIAL", description: "Proof of funds (bank statements, investment proofs)", required: true },
  ],
  PNP: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "LANGUAGE_TEST", description: "IELTS/CELPIP language test results", required: true },
    { category: "EDUCATION", description: "ECA report + degree certificates", required: true },
    { category: "WORK_EXPERIENCE", description: "Reference letters for all claimed work experience", required: true },
    { category: "POLICE_CERTIFICATE", description: "Police clearance certificates", required: true },
    { category: "MEDICAL", description: "Medical exam results", required: false },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "FINANCIAL", description: "Proof of settlement funds", required: true },
    { category: "OTHER", description: "Provincial nomination certificate", required: true },
  ],
  STUDY_PERMIT: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "EDUCATION", description: "Letter of acceptance from DLI", required: true },
    { category: "FINANCIAL", description: "Proof of financial support (tuition + living expenses)", required: true },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "MEDICAL", description: "Medical exam results (if required for country)", required: false },
    { category: "POLICE_CERTIFICATE", description: "Police clearance (if required)", required: false },
    { category: "OTHER", description: "Statement of purpose / study plan", required: true },
  ],
  WORK_PERMIT: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "WORK_EXPERIENCE", description: "Reference letters + CV/resume", required: true },
    { category: "EDUCATION", description: "Degree/diploma certificates", required: false },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "MEDICAL", description: "Medical exam results (if required)", required: false },
    { category: "POLICE_CERTIFICATE", description: "Police clearance (if required)", required: false },
    { category: "OTHER", description: "Job offer letter / LMIA (if applicable)", required: true },
  ],
  VISITOR_VISA: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "FINANCIAL", description: "Proof of funds for duration of stay", required: true },
    { category: "OTHER", description: "Purpose of travel / itinerary", required: true },
    { category: "OTHER", description: "Ties to home country (employment, property, family)", required: true },
    { category: "MEDICAL", description: "Medical exam results (if required)", required: false },
  ],
  FAMILY_SPONSORSHIP: [
    { category: "PASSPORT", description: "Valid passports for sponsor and applicant", required: true },
    { category: "MARRIAGE_CERTIFICATE", description: "Marriage certificate (if sponsoring spouse)", required: false },
    { category: "BIRTH_CERTIFICATE", description: "Birth certificates for all family members", required: true },
    { category: "PHOTO", description: "Digital photos meeting IRCC specifications", required: true },
    { category: "POLICE_CERTIFICATE", description: "Police clearance for applicant", required: true },
    { category: "MEDICAL", description: "Medical exam results for applicant", required: true },
    { category: "FINANCIAL", description: "Proof of sponsor's income (NOA, employment letter)", required: true },
    { category: "OTHER", description: "Relationship evidence (photos, communication, joint accounts)", required: true },
  ],
  CITIZENSHIP: [
    { category: "PASSPORT", description: "Valid passport + all expired passports during eligibility period", required: true },
    { category: "PHOTO", description: "Citizenship photo meeting IRCC specifications", required: true },
    { category: "LANGUAGE_TEST", description: "Language proof (IELTS/CELPIP/LINC diploma)", required: true },
    { category: "EDUCATION", description: "Degree/diploma (if using for language proof)", required: false },
    { category: "POLICE_CERTIFICATE", description: "Police clearance (if required)", required: false },
    { category: "OTHER", description: "Physical presence calculation + supporting documents", required: true },
  ],
  OTHER: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "OTHER", description: "Case-specific documents (to be specified by consultant)", required: true },
  ],
  SPOUSAL_SPONSORSHIP: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "MARRIAGE_CERTIFICATE", description: "Marriage certificate", required: true },
    { category: "POLICE_CERTIFICATE", description: "Police clearance (spouse and sponsor)", required: true },
    { category: "MEDICAL", description: "Medical exam receipt (upfront)", required: false },
    { category: "OTHER", description: "Relationship proof documents", required: true },
  ],
  SPOUSAL_OWP: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "OTHER", description: "Spousal OWP supporting documents", required: true },
  ],
  SUPER_VISA: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "MEDICAL", description: "Medical exam receipt (upfront)", required: true },
    { category: "INSURANCE", description: "Canadian medical insurance proof (min $100k)", required: true },
    { category: "INVITATION", description: "Letter of invitation from host child/grandchild", required: true },
    { category: "FINANCIAL", description: "Host's proof of income (NOA/T4)", required: true },
    { category: "OTHER", description: "Super Visa supporting documents", required: false },
  ],
  TRP: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "OTHER", description: "TRP application + explanation letter", required: true },
  ],
  REFUGEE: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "IDENTITY", description: "Identity documents (birth certificate, national ID)", required: true },
    { category: "POLICE_CERTIFICATE", description: "Police clearance (if available)", required: false },
    { category: "OTHER", description: "Refugee claim supporting evidence", required: true },
  ],
  VULNERABLE_WORKER: [
    { category: "PASSPORT", description: "Valid passport (bio page scan)", required: true },
    { category: "PHOTO", description: "Digital photo meeting IRCC specifications", required: true },
    { category: "WORK_PERMIT", description: "Current/previous work permit", required: true },
    { category: "OTHER", description: "Vulnerable Worker OWP supporting documents", required: true },
  ],
};

// ─── Build Checklist ───────────────────────────────────────────────────────

export function buildChecklist(caseType: CaseType): Omit<ChecklistItem, "sent" | "sentAt" | "received" | "receivedAt">[] {
  const template = DEFAULT_CHECKLISTS[caseType];
  if (!template) return DEFAULT_CHECKLISTS.OTHER.map((item) => ({ ...item }));
  return template.map((item) => ({ ...item }));
}

/**
 * Build a full CaseChecklist with tracking fields initialized to false.
 * Sent/received status is resolved at query time from ActivityLog and
 * Document records.
 */
export function buildCaseChecklist(caseId: string, caseType: CaseType): CaseChecklist {
  return {
    caseId,
    caseType,
    items: buildChecklist(caseType).map((item) => ({
      ...item,
      sent: false,
      sentAt: null,
      received: false,
      receivedAt: null,
    })),
    lastSentAt: null,
  };
}

// ─── Load Checklist with Live Tracking ─────────────────────────────────────

/**
 * Load the checklist for a case, resolving sent/received status from
 * the database (ActivityLog for sent, Document records for received).
 *
 * This is the primary way to get a checklist with accurate tracking.
 */
export async function loadChecklistFromCase(
  caseId: string,
): Promise<CaseChecklist | null> {
  const supabase = getSupabaseAdmin();

  const { data: caseRecord } = await supabase
    .from("Case")
    .select("caseType")
    .eq("id", caseId)
    .single();

  if (!caseRecord) return null;

  const checklist = buildCaseChecklist(caseId, caseRecord.caseType as CaseType);

  // Resolve sent status from ActivityLog
  const { data: sentLogs } = await supabase
    .from("ActivityLog")
    .select("metadata, timestamp")
    .eq("entityType", "Case")
    .eq("entityId", caseId)
    .eq("action", "CHECKLIST_ITEM_SENT");

  if (sentLogs) {
    for (const log of sentLogs) {
      const meta = log.metadata as Record<string, unknown> | null;
      const category = meta?.category as string | undefined;
      const description = meta?.description as string | undefined;
      const idx = checklist.items.findIndex(
        (i) => i.category === category && i.description === description,
      );
      if (idx !== -1) {
        checklist.items[idx].sent = true;
        checklist.items[idx].sentAt = log.timestamp;
      }
    }

    if (sentLogs.length > 0) {
      checklist.lastSentAt = sentLogs.reduce(
        (latest, log) => (log.timestamp > latest ? log.timestamp : latest),
        sentLogs[0].timestamp,
      );
    }
  }

  // Resolve received status from Document records
  const { data: documents } = await supabase
    .from("Document")
    .select("category, createdAt")
    .eq("caseId", caseId);

  if (documents) {
    for (const doc of documents) {
      const idx = checklist.items.findIndex(
        (i) => i.category === doc.category && !i.received,
      );
      if (idx !== -1) {
        checklist.items[idx].received = true;
        checklist.items[idx].receivedAt = doc.createdAt;
      }
    }
  }

  return checklist;
}

// ─── Send Checklist Email ──────────────────────────────────────────────────

/**
 * Send a document checklist email to a client.
 *
 * Builds the document_request email template with the specified checklist
 * items (or all unsent required items), sends via Resend, and logs
 * sent items to ActivityLog for tracking.
 */
export async function sendChecklistEmail(
  params: SendChecklistParams,
): Promise<SendChecklistResult> {
  try {
    const checklist = await loadChecklistFromCase(params.caseId);
    if (!checklist) {
      return { success: false, sentCount: 0, failedCount: 0, error: "Case not found" };
    }

    // Determine which items to send
    const itemsToSend = params.itemIndices
      ? params.itemIndices.map((i) => checklist.items[i]).filter(Boolean)
      : checklist.items.filter((item) => item.required && !item.sent);

    if (itemsToSend.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        error: "No unsent required items to send",
      };
    }

    // Fetch case title for the email
    const supabase = getSupabaseAdmin();
    const { data: caseRecord } = await supabase
      .from("Case")
      .select("title, organizationId")
      .eq("id", params.caseId)
      .single();

    // Build email data
    const emailData: DocumentRequestData = {
      clientName: params.clientName,
      caseTitle: caseRecord?.title ?? "Your Immigration Case",
      consultantName: params.consultantName,
      organizationName: params.organizationName,
      requestedDocuments: itemsToSend.map((item) => ({
        category: item.category,
        description: item.description,
      })),
      clientPortalToken: params.clientPortalToken,
      dueDate: params.dueDate,
    };

    // Generate and send email
    const { subject, html } = documentRequestEmail(emailData);
    const emailResult = await sendEmail({
      to: { email: params.clientEmail, name: params.clientName },
      subject,
      html,
      tags: [
        { name: "trigger", value: "document_request" },
        { name: "case_id", value: params.caseId },
      ],
    });

    if (!emailResult.success) {
      return {
        success: false,
        sentCount: 0,
        failedCount: itemsToSend.length,
        emailResult,
        error: emailResult.error,
      };
    }

    // Log each sent item to ActivityLog for tracking
    const now = new Date().toISOString();
    const orgId = caseRecord?.organizationId;
    if (orgId) {
      await Promise.all(
        itemsToSend.map((item) =>
          supabase.from("ActivityLog").insert({
            organizationId: orgId,
            userId: "system",
            action: "CHECKLIST_ITEM_SENT",
            entityType: "Case",
            entityId: params.caseId,
            metadata: { category: item.category, description: item.description, sentTo: params.clientEmail },
            timestamp: now,
          }),
        ),
      );
    }

    return {
      success: true,
      sentCount: itemsToSend.length,
      failedCount: 0,
      emailResult,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown checklist send error";
    console.error("[Checklist] Send error:", err);
    return { success: false, sentCount: 0, failedCount: 0, error: message };
  }
}

// ─── Mark Checklist Item as Received ───────────────────────────────────────

/**
 * Check if a document upload satisfies a checklist item.
 * Called after document upload to verify checklist progress.
 * Returns true if the document matches an unsent checklist item.
 */
export async function matchDocumentToChecklist(
  caseId: string,
  category: DocumentCategory,
): Promise<boolean> {
  const checklist = await loadChecklistFromCase(caseId);
  if (!checklist) return false;

  const item = checklist.items.find(
    (i) => i.category === category && !i.received,
  );

  return !!item;
}

// ─── Get Checklist Progress ────────────────────────────────────────────────

export interface ChecklistProgress {
  total: number;
  required: number;
  sent: number;
  received: number;
  percentComplete: number;
}

/**
 * Calculate checklist completion progress for a case.
 */
export async function getChecklistProgress(
  caseId: string,
): Promise<ChecklistProgress | null> {
  const checklist = await loadChecklistFromCase(caseId);
  if (!checklist) return null;

  const required = checklist.items.filter((i) => i.required);
  const total = checklist.items.length;
  const sent = checklist.items.filter((i) => i.sent).length;
  const received = checklist.items.filter((i) => i.received).length;
  const requiredReceived = required.filter((i) => i.received).length;
  const percentComplete =
    required.length > 0
      ? Math.round((requiredReceived / required.length) * 100)
      : 0;

  return { total, required: required.length, sent, received, percentComplete };
}
