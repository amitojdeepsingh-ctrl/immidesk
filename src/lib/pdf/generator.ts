// ═══════════════════════════════════════════════════════════════════════════
// PDF Generator — renders service agreements to PDF using jsPDF
// ═══════════════════════════════════════════════════════════════════════════
// Produces professional, print-ready PDF documents for immigration service
// agreements. Uses jsPDF with autoTable for structured layout.
// ═══════════════════════════════════════════════════════════════════════════

import { jsPDF } from "jspdf";
import "jspdf-autotable";
import type { AgreementTemplateData, AgreementSection } from "./agreement-template";
import { buildAgreementSections } from "./agreement-template";

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_MARGIN = 20; // mm
const CONTENT_WIDTH = 170; // A4 is 210mm wide, 20mm margins = 170mm
const FONT_FAMILY = "helvetica";
const LINE_HEIGHT = 5.5; // mm

const FONT_SIZES = {
  title: 16,
  heading: 12,
  body: 10,
  small: 8,
  footer: 7,
} as const;

const COLORS = {
  text: [30, 30, 30] as [number, number, number],
  heading: [50, 50, 50] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  border: [200, 200, 200] as [number, number, number],
  accent: [15, 23, 42] as [number, number, number],
};

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Generate a service agreement PDF and return it as a Buffer.
 */
export async function generateAgreementPdf(
  data: AgreementTemplateData,
): Promise<Buffer> {
  const sections = buildAgreementSections(data);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let cursorY = PAGE_MARGIN;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const isFirst = i === 0;
    const isLast = i === sections.length - 1;

    const estimatedHeight = estimateSectionHeight(doc, section);
    if (cursorY + estimatedHeight > 275 && !isFirst) {
      doc.addPage();
      cursorY = PAGE_MARGIN;
    }

    cursorY = renderSection(doc, section, cursorY, isFirst, isLast);
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(FONT_SIZES.footer);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Agreement #${data.meta.agreementNumber} | Page ${p} of ${pageCount}`,
      PAGE_MARGIN,
      290,
      { align: "left" },
    );
    doc.text(
      `Generated: ${data.meta.generatedAt}`,
      PAGE_MARGIN + CONTENT_WIDTH,
      290,
      { align: "right" },
    );
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

// ─── Section Rendering ─────────────────────────────────────────────────────

function renderSection(
  doc: jsPDF,
  section: AgreementSection,
  startY: number,
  isFirst: boolean,
  isLast: boolean,
): number {
  let y = startY;

  if (isFirst) {
    doc.setFontSize(FONT_SIZES.title);
    doc.setTextColor(...COLORS.accent);
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(section.heading, PAGE_MARGIN, y);
    y += 10;

    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.5);
    doc.line(PAGE_MARGIN, y, PAGE_MARGIN + 60, y);
    y += 8;
  } else {
    doc.setFontSize(FONT_SIZES.heading);
    doc.setTextColor(...COLORS.heading);
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(section.heading, PAGE_MARGIN, y);
    y += 7;
  }

  doc.setFontSize(FONT_SIZES.body);
  doc.setTextColor(...COLORS.text);
  doc.setFont(FONT_FAMILY, "normal");

  const lines = splitTextToLines(doc, section.body, CONTENT_WIDTH);

  for (const line of lines) {
    const boldPattern = /\*\*(.+?)\*\*/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    let xOffset = PAGE_MARGIN;

    boldPattern.lastIndex = 0;

    while ((match = boldPattern.exec(line)) !== null) {
      const before = line.slice(lastIndex, match.index);
      if (before) {
        doc.setFont(FONT_FAMILY, "normal");
        doc.text(before, xOffset, y);
        xOffset += doc.getTextWidth(before);
      }

      doc.setFont(FONT_FAMILY, "bold");
      doc.text(match[1], xOffset, y);
      xOffset += doc.getTextWidth(match[1]);

      lastIndex = match.index + match[0].length;
    }

    const remaining = line.slice(lastIndex);
    if (remaining) {
      doc.setFont(FONT_FAMILY, "normal");
      doc.text(remaining, xOffset, y);
    }

    y += LINE_HEIGHT;
  }

  if (section.image) {
    try {
      const img = section.image;
      const maxW = 80;
      const scale = Math.min(1, maxW / img.width);
      const w = img.width * scale;
      const h = img.height * scale;
      doc.addImage(img.dataUrl, "PNG", PAGE_MARGIN, y, w, h);
      y += h + 4;
    } catch {
      // silently skip — invalid image data
    }
  }

  if (isLast) {
    y += 4;
  } else {
    y += 2;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_WIDTH, y);
    y += 5;
  }

  return y;
}

// ─── Text Helpers ──────────────────────────────────────────────────────────

function splitTextToLines(
  doc: jsPDF,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    const wrapped = doc.splitTextToSize(paragraph, maxWidth);
    const wrappedLines = Array.isArray(wrapped) ? wrapped : [wrapped];
    lines.push(...wrappedLines);
  }

  return lines;
}

function estimateSectionHeight(doc: jsPDF, section: AgreementSection): number {
  const headingHeight = 10;
  const lines = splitTextToLines(doc, section.body, CONTENT_WIDTH);
  const bodyHeight = lines.length * LINE_HEIGHT;
  const spacing = 7;
  return headingHeight + bodyHeight + spacing;
}