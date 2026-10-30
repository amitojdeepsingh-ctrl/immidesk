import { describe, expect, it } from "vitest";
import { generateAcknowledgementPdf } from "../acknowledgement-pdf";
import { buildAcknowledgementClauses } from "@/lib/document-acknowledgement";

describe("acknowledgement PDF", () => {
  it("renders a PDF with the statement, document table and signature block", () => {
    const items = [
      {
        documentId: "d1",
        name: "Bank Statement (1).pdf",
        category: "FINANCIAL",
        uploadedAt: "2026-09-13T00:00:00.000Z",
        applicantLabel: "PRIMARY",
        notes: null,
      },
      {
        documentId: "d2",
        name: "résumé.pdf",
        category: "EDUCATION",
        uploadedAt: "2026-09-14T00:00:00.000Z",
        applicantLabel: null,
        notes: null,
      },
    ];

    const buffer = generateAcknowledgementPdf({
      firm: {
        name: "ADS Immigration Services",
        address: "#66-10772 Guildford Drive, Surrey, BC, V3R 1W6",
        phone: "+1 (604) 363-9350",
        email: "info@adsimmigration.com",
        ciccNumber: "R706757",
        rcicName: "Amitojdeep Singh",
      },
      client: { fullName: "Anureet Kaur", email: "client@example.com" },
      acknowledgement: {
        id: "12345678-1234-1234-1234-123456789012",
        title: "Document Acknowledgement",
        statementVersion: "1.0",
        items,
        clauses: buildAcknowledgementClauses({ clientName: "Anureet Kaur", applicationLabel: "STUDY_PERMIT" }),
        printedName: "Anureet Kaur",
        clientNote: "Bank statement for March has a missing page.",
        signedAt: "2026-10-30T07:24:27.837Z",
        signedIp: "50.67.32.151",
        signatureDataUrl: null,
      },
    });

    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
