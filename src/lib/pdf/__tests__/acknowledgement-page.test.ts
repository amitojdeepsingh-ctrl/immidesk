import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { appendAcknowledgementPage } from "../acknowledgement-page";
import { acknowledgementStatement } from "@/lib/document-acknowledgement";

async function makeSourcePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([595.28, 841.89]);
  return Buffer.from(await doc.save());
}

const base = {
  firm: {
    name: "ADS Immigration Services",
    address: "#66-10772 Guildford Drive, Surrey, BC, V3R 1W6",
    phone: "+1 (604) 363-9350",
    email: "info@adsimmigration.com",
    rcicName: "Amitdeep Singh",
    ciccNumber: "R706757",
  },
  clientName: "Krishan Sharma",
  clientEmail: "client@example.com",
  reference: "ABCD1234",
  documents: ["Krishan Sharma — merged documents.pdf"],
  statement: acknowledgementStatement("ADS Immigration Services"),
};

describe("acknowledgement page", () => {
  it("appends exactly one page and keeps the source pages", async () => {
    const source = await makeSourcePdf(3);
    const result = await appendAcknowledgementPage(source, base);
    const pdf = await PDFDocument.load(new Uint8Array(result));
    expect(pdf.getPageCount()).toBe(4);
    expect(result.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("draws onto the appended page when the client has signed", async () => {
    const source = await makeSourcePdf(1);
    const signed = await appendAcknowledgementPage(source, {
      ...base,
      signed: {
        printedName: "Krishan Sharma",
        dateLine: "October 30, 2026",
        signaturePngDataUrl: null,
        clientNote: "Bank statement for March has a missing page.",
      },
    });
    const pdf = await PDFDocument.load(new Uint8Array(signed));
    expect(pdf.getPageCount()).toBe(2);
    expect(signed.length).toBeGreaterThan(1000);
  });

  it("still produces a page when there is no source PDF", async () => {
    const result = await appendAcknowledgementPage(null, base);
    const pdf = await PDFDocument.load(new Uint8Array(result));
    expect(pdf.getPageCount()).toBe(1);
  });

  it("wraps a long document name instead of overflowing the page", async () => {
    const source = await makeSourcePdf(1);
    const longName = `${"Very long filename ".repeat(12)}.pdf`;
    const result = await appendAcknowledgementPage(source, { ...base, documents: [longName] });
    const pdf = await PDFDocument.load(new Uint8Array(result));
    expect(pdf.getPageCount()).toBe(2);
    expect(result.length).toBeGreaterThan(1000);
  });
});
