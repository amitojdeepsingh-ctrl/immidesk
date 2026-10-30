// ═══════════════════════════════════════════════════════════════════════════
// Document Acknowledgement PDF
// ═══════════════════════════════════════════════════════════════════════════
// Print-ready record of a signed acknowledgement: firm header, itemized
// document list as presented, the signed statement, signature, printed
// name, timestamp, IP, and document fingerprint.
// ═══════════════════════════════════════════════════════════════════════════

import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { AcknowledgementClause, AcknowledgementItem } from "@/lib/document-acknowledgement";

const PAGE_MARGIN = 20;
const CONTENT_WIDTH = 170;
const FONT = "helvetica";
const LINE_HEIGHT = 5.2;

const TEXT: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [120, 120, 120];
const ACCENT: [number, number, number] = [15, 23, 42];

export interface AcknowledgementPdfData {
  firm: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    ciccNumber?: string;
    rcicName?: string;
  };
  client: {
    fullName: string;
    email: string;
  };
  acknowledgement: {
    id: string;
    title: string;
    statementVersion: string;
    items: AcknowledgementItem[];
    clauses: AcknowledgementClause[];
    printedName: string;
    clientNote: string | null;
    signedAt: string;
    signedIp: string | null;
    signatureDataUrl: string | null;
  };
}

export function generateAcknowledgementPdf(data: AcknowledgementPdfData): Buffer {
  const { firm, client, acknowledgement: ack } = data;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const bottomLimit = 275;

  let y = PAGE_MARGIN;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  const writeParagraph = (text: string, size: number, style: "normal" | "bold" = "normal", color: [number, number, number] = TEXT) => {
    doc.setFont(FONT, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
    for (const line of lines) {
      addPageIfNeeded(LINE_HEIGHT);
      doc.text(line, PAGE_MARGIN, y);
      y += LINE_HEIGHT;
    }
  };

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFont(FONT, "bold");
  doc.setFontSize(15);
  doc.setTextColor(...ACCENT);
  doc.text(firm.name, PAGE_MARGIN, y);
  y += 6;

  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const contact = [firm.address, firm.phone, firm.email].filter(Boolean).join("  ·  ");
  if (contact) {
    const lines = doc.splitTextToSize(contact, CONTENT_WIDTH) as string[];
    for (const line of lines) {
      doc.text(line, PAGE_MARGIN, y);
      y += 4;
    }
  }
  y += 4;

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.4);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_WIDTH, y);
  y += 8;

  // ── Title ────────────────────────────────────────────────────────────────
  doc.setFont(FONT, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...ACCENT);
  doc.text("DOCUMENT ACKNOWLEDGEMENT", PAGE_MARGIN, y);
  y += 7;

  doc.setFont(FONT, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Reference ${ack.id.slice(0, 8).toUpperCase()}  ·  Statement version ${ack.statementVersion}`, PAGE_MARGIN, y);
  y += 9;

  writeParagraph(`Client: ${client.fullName} (${client.email})`, 10);
  if (firm.rcicName || firm.ciccNumber) {
    writeParagraph(
      `Consultant: ${firm.rcicName ?? firm.name}${firm.ciccNumber ? `, RCIC ${firm.ciccNumber}` : ""}`,
      10,
    );
  }
  y += 3;

  // ── Statement ────────────────────────────────────────────────────────────
  writeParagraph("Statement", 11, "bold", ACCENT);
  y += 1;
  for (const clause of ack.clauses) {
    addPageIfNeeded(10);
    writeParagraph(`${clause.number}. ${clause.text}`, 9.5);
    y += 1;
  }
  y += 2;

  // ── Document list ────────────────────────────────────────────────────────
  writeParagraph(`Documents covered by this acknowledgement (${ack.items.length})`, 11, "bold", ACCENT);
  y += 2;

  const rows = ack.items.map((item, i) => [
    String(i + 1),
    item.name,
    item.category.replace(/_/g, " "),
    item.applicantLabel ?? "—",
    item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString("en-CA") : "—",
  ]);

  let tableEnd = y;
  autoTable(doc, {
    startY: y,
    head: [["#", "Document", "Category", "Applicant", "Uploaded"]],
    body: rows.length > 0 ? rows : [["—", "No documents listed", "—", "—", "—"]],
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { font: FONT, fontSize: 8, cellPadding: 2, textColor: TEXT },
    headStyles: { font: FONT, fontStyle: "bold", fontSize: 8, fillColor: ACCENT, textColor: [255, 255, 255] },
    columnStyles: { 0: { cellWidth: 8 }, 4: { cellWidth: 24 } },
    theme: "grid",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tableEnd = ((doc as any).lastAutoTable?.finalY as number | undefined) ?? y;

  y = tableEnd + 8;

  // ── Client note ──────────────────────────────────────────────────────────
  if (ack.clientNote) {
    addPageIfNeeded(20);
    writeParagraph("Disclosures and notes from the client", 10, "bold", ACCENT);
    writeParagraph(ack.clientNote, 9.5);
    y += 3;
  }

  // ── Signature ────────────────────────────────────────────────────────────
  addPageIfNeeded(45);
  writeParagraph("Signed", 11, "bold", ACCENT);
  y += 2;

  if (ack.signatureDataUrl) {
    try {
      doc.addImage(ack.signatureDataUrl, "PNG", PAGE_MARGIN, y, 60, 20);
    } catch {
      // Invalid image data — fall through to the printed name only.
    }
    y += 24;
  } else {
    y += 6;
  }

  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + 80, y);
  y += 5;
  writeParagraph(`${ack.printedName} (client)`, 9.5, "bold");
  writeParagraph(`Signed ${new Date(ack.signedAt).toLocaleString("en-CA", { timeZone: "America/Los_Angeles" })} Pacific`, 8.5, "normal", MUTED);
  if (ack.signedIp) writeParagraph(`IP address ${ack.signedIp}`, 8, "normal", MUTED);

  // ── Footer ───────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`Acknowledgement ${ack.id.slice(0, 8).toUpperCase()} · Page ${p} of ${pageCount}`, PAGE_MARGIN, 290);
    doc.text(`${firm.name}`, PAGE_MARGIN + CONTENT_WIDTH, 290, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
