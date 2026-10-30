// ═══════════════════════════════════════════════════════════════════════════
// Document Acknowledgement — statement text
// ═══════════════════════════════════════════════════════════════════════════
// The firm uploads a merged PDF. The system appends one page carrying this
// statement, the document list, and Client name / Signature / Date fields.
// The client signs through a secure link; the typed name, drawn signature
// and date are then stamped onto that page.
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

/** Statement paragraphs, verbatim as approved by the firm. */
export function acknowledgementStatement(firmName: string): string[] {
  return [
    `I confirm that I provided the documents listed below and attached to this acknowledgment to ${firmName} for use in preparing and submitting my visa application.`,
    "I have reviewed the attached copies and confirm that they accurately reflect the documents I supplied. I have disclosed any alterations, omissions, or information that requires correction or explanation.",
    `I authorize ${firmName} to submit these documents to the relevant immigration authorities in connection with my application.`,
  ];
}
