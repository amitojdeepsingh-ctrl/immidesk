// ═══════════════════════════════════════════════════════════════════════════
// Acknowledgement page appended to a merged document PDF
// ═══════════════════════════════════════════════════════════════════════════
// Loads the firm's merged PDF, keeps every page untouched, and appends one
// A4 page carrying the acknowledgement statement, the document list, and
// Client name / Signature / Date. When the client has signed, the typed
// name, drawn signature image and date are drawn onto that page.
// ═══════════════════════════════════════════════════════════════════════════

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const CONTENT_WIDTH = A4[0] - MARGIN * 2;
const INK = rgb(0.11, 0.11, 0.13);
const MUTED = rgb(0.45, 0.45, 0.48);
const RULE = rgb(0.72, 0.72, 0.75);

export interface AcknowledgementPageData {
  firm: { name: string; address?: string; phone?: string; email?: string; rcicName?: string; ciccNumber?: string };
  clientName: string;
  clientEmail?: string;
  reference: string;
  documents: string[];
  statement: string[];
  signed?: {
    printedName: string;
    dateLine: string;
    signaturePngDataUrl?: string | null;
    clientNote?: string | null;
  };
}

export async function appendAcknowledgementPage(
  sourcePdf: Buffer | Uint8Array | null,
  data: AcknowledgementPageData,
): Promise<Buffer> {
  // Copy into a plain Uint8Array: a Node Buffer from another realm (or a
  // Buffer polyfill in the browser/test env) fails pdf-lib's instanceof check.
  const bytes = sourcePdf ? new Uint8Array(sourcePdf as unknown as ArrayLike<number>) : null;
  const pdf = bytes ? await PDFDocument.load(bytes, { ignoreEncryption: true }) : await PDFDocument.create();
  const page = pdf.addPage(A4);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = A4[1] - MARGIN;

  const writeLines = (text: string, opts: { size?: number; font?: PDFFont; color?: typeof INK; leading?: number } = {}) => {
    const size = opts.size ?? 10.5;
    const activeFont = opts.font ?? font;
    const leading = opts.leading ?? size * 1.45;
    for (const line of wrapText(text, activeFont, size, CONTENT_WIDTH)) {
      y -= leading;
      page.drawText(line, { x: MARGIN, y, size, font: activeFont, color: opts.color ?? INK });
    }
  };

  const space = (n: number) => {
    y -= n;
  };

  const rule = () => {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 0.6, color: RULE });
  };

  // ── Header ──────────────────────────────────────────────────────────────
  page.drawText(data.firm.name, { x: MARGIN, y: y - 16, size: 15, font: bold, color: INK });
  y -= 22;
  const contact = [data.firm.address, data.firm.phone, data.firm.email].filter(Boolean).join("  ·  ");
  if (contact) writeLines(contact, { size: 8, color: MUTED, leading: 10 });
  space(6);
  rule();
  space(18);

  page.drawText("ACKNOWLEDGEMENT OF DOCUMENTS", { x: MARGIN, y, size: 13, font: bold, color: INK });
  y -= 14;
  const rcic = data.firm.rcicName
    ? `${data.firm.rcicName}${data.firm.ciccNumber ? `, RCIC ${data.firm.ciccNumber}` : ""}`
    : data.firm.ciccNumber
      ? `RCIC ${data.firm.ciccNumber}`
      : null;
  const meta = [rcic, `Reference ${data.reference}`].filter(Boolean).join("  ·  ");
  page.drawText(meta, { x: MARGIN, y, size: 8.5, font, color: MUTED });
  space(16);

  // ── Statement ───────────────────────────────────────────────────────────
  for (const paragraph of data.statement) {
    writeLines(paragraph, { size: 10.5 });
    space(8);
  }

  // ── Document list ───────────────────────────────────────────────────────
  space(6);
  page.drawText(`Documents attached to this acknowledgment (${data.documents.length})`, {
    x: MARGIN, y, size: 10, font: bold, color: INK,
  });
  space(8);

  const listRows = data.documents.length > 0 ? data.documents : ["No documents listed"];
  for (const [i, name] of listRows.entries()) {
    const label = `${i + 1}.  ${name}`;
    writeLines(label, { size: 9.5, leading: 12 });
  }

  if (data.signed?.clientNote) {
    space(6);
    page.drawText("Client disclosure", { x: MARGIN, y, size: 9.5, font: bold, color: INK });
    space(4);
    writeLines(data.signed.clientNote, { size: 9, color: rgb(0.35, 0.28, 0.05) });
  }

  // ── Signature block ─────────────────────────────────────────────────────
  space(24);
  drawField(page, "Client name", data.signed?.printedName ?? "", MARGIN, y, font, bold);
  space(40);
  drawField(page, "Signature", "", MARGIN, y, font, bold);

  if (data.signed?.signaturePngDataUrl) {
    try {
      const bytes = Buffer.from(data.signed.signaturePngDataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
      const image = await pdf.embedPng(bytes);
      const maxW = 190;
      const maxH = 46;
      const scale = Math.min(maxW / image.width, maxH / image.height, 1);
      page.drawImage(image, {
        x: MARGIN,
        y: y - image.height * scale - 2,
        width: image.width * scale,
        height: image.height * scale,
      });
    } catch {
      // Invalid signature data — the printed name above still identifies the signer.
    }
  }

  // Date sits on the same baseline row as the signature block
  const dateX = MARGIN + CONTENT_WIDTH * 0.62;
  page.drawText("Date", { x: dateX, y: y + 12, size: 8, font, color: MUTED });
  page.drawText(data.signed?.dateLine ?? "", { x: dateX, y: y + 1, size: 10.5, font, color: INK });
  page.drawLine({ start: { x: dateX, y: y - 2 }, end: { x: MARGIN + CONTENT_WIDTH, y: y - 2 }, thickness: 0.6, color: RULE });

  // ── Footer ──────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: MARGIN, y: MARGIN + 20 }, end: { x: MARGIN + CONTENT_WIDTH, y: MARGIN + 20 }, thickness: 0.4, color: RULE });
  page.drawText(
    `${data.firm.name} · Document acknowledgement ${data.reference} · Page ${pdf.getPageCount()} of ${pdf.getPageCount()}`,
    { x: MARGIN, y: MARGIN + 10, size: 7.5, font, color: MUTED },
  );

  return Buffer.from(await pdf.save());
}

function drawField(page: PDFPage, label: string, value: string, x: number, y: number, font: PDFFont, bold: PDFFont) {
  page.drawText(label, { x, y: y + 12, size: 8, font, color: MUTED });
  if (value) page.drawText(value, { x, y: y + 1, size: 10.5, font, color: INK });
  page.drawLine({ start: { x, y: y - 2 }, end: { x: x + CONTENT_WIDTH * 0.55, y: y - 2 }, thickness: 0.6, color: RULE });
  void bold;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      // Break an over-long token (URL, long filename) across lines.
      let chunk = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(chunk + char, size) > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      line = chunk;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
