// ═══════════════════════════════════════════════════════════════════════════
// Document Acknowledgement — statement text and shared types
// ═══════════════════════════════════════════════════════════════════════════
// The client signs one statement covering an itemized list of documents.
// The document list is snapshotted at send time so the signed record shows
// exactly what was presented, even if documents are later added or removed.
// ═══════════════════════════════════════════════════════════════════════════

export const ACKNOWLEDGEMENT_STATEMENT_VERSION = "1.0";

export interface AcknowledgementItem {
  documentId: string;
  name: string;
  category: string;
  uploadedAt: string | null;
  applicantLabel: string | null;
  notes: string | null;
}

export interface AcknowledgementClause {
  number: number;
  text: string;
}

/**
 * The statement the client signs. Wording mirrors the firm's
 * "Financial Documents Authenticity Confirmation" and the retainer's
 * section E, in the same active voice.
 */
export function buildAcknowledgementClauses(ctx: {
  clientName: string;
  applicationLabel: string | null;
}): AcknowledgementClause[] {
  const application = ctx.applicationLabel ? ` for my ${ctx.applicationLabel} application` : "";
  return [
    {
      number: 1,
      text: `I, ${ctx.clientName}, provided the documents listed below to the firm${application}, or I received them from the person or organization identified in each document.`,
    },
    {
      number: 2,
      text: "To the best of my knowledge, each document is genuine, complete, accurate, and current as of the date I sign this acknowledgement.",
    },
    {
      number: 3,
      text: "I have not altered, edited, or arranged for anyone to alter any document or the information shown in it.",
    },
    {
      number: 4,
      text: "I have disclosed any missing page, translation issue, unusual transaction, loan, gift, transfer, or other fact that affects how a document should be read.",
    },
    {
      number: 5,
      text: "I will tell the firm immediately if I find an error in a document, if a document changes, or if I learn that a document is incomplete, unavailable, or not what it appears to be.",
    },
    {
      number: 6,
      text: "I understand that the firm's review of these documents is limited to relevance, consistency, completeness, and presentation. It is not a bank verification, audit, forensic examination, valuation, or independent authentication of any document.",
    },
    {
      number: 7,
      text: "I understand that submitting a false, altered, or misleading document may lead to refusal of my application, a finding of misrepresentation under the Immigration and Refugee Protection Act, and withdrawal of representation.",
    },
    {
      number: 8,
      text: "I understand that signing this acknowledgement does not guarantee approval of my application, does not decide the outcome, and does not limit the consultant's professional obligations.",
    },
  ];
}

export function buildAcknowledgementTitle(applicationLabel: string | null): string {
  return applicationLabel ? `Document Acknowledgement — ${applicationLabel}` : "Document Acknowledgement";
}
