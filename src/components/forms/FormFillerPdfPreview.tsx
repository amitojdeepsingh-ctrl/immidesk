"use client";

import { useMemo, useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import type { FormField, PrefillData } from "./FormFillerFieldList";
import { Download, Eye, FileText } from "lucide-react";

interface FormFillerPdfPreviewProps {
  formName: string;
  formCode: string;
  fields: FormField[];
  prefilledData: PrefillData;
  clientName?: string;
}

export function FormFillerPdfPreview({
  formName,
  formCode,
  fields,
  prefilledData,
  clientName,
}: FormFillerPdfPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePreview = useCallback(() => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(formCode, pageWidth - 10, y, { align: "right" });

      y += 8;
      doc.setFontSize(14);
      doc.setTextColor(30);
      doc.text(formName, 15, y);

      y += 4;
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(`Generated for: ${clientName ?? "Client"}`, 15, y);

      y += 10;
      doc.setFontSize(6.5);
      doc.text("FIELD", 15, y);
      doc.text("VALUE", 95, y);
      doc.setDrawColor(200);
      doc.line(15, y + 1, pageWidth - 15, y + 1);

      y += 6;

      for (const field of fields) {
        const value = prefilledData[field.key];
        const displayValue = value !== null && value !== undefined && value !== ""
          ? String(value)
          : "(empty)";

        const isFilled = value !== null && value !== undefined && value !== "";

        if (y > 260) {
          doc.addPage();
          y = 15;
          doc.setFontSize(6.5);
          doc.text("FIELD", 15, y);
          doc.text("VALUE", 95, y);
          doc.setDrawColor(200);
          doc.line(15, y + 1, pageWidth - 15, y + 1);
          y += 6;
        }

        doc.setFontSize(7);
        doc.setTextColor(isFilled ? 50 : 180);
        const label = field.label.length > 40 ? field.label.slice(0, 40) + "..." : field.label;
        doc.text(label, 15, y);

        doc.setTextColor(isFilled ? 30 : 200);
        doc.text(
          field.type === "boolean"
            ? displayValue === "true"
              ? "Yes"
              : displayValue === "false"
                ? "No"
                : displayValue
            : displayValue,
          95,
          y,
        );

        y += 4.5;
      }

      y += 6;
      doc.setDrawColor(200);
      doc.line(15, y, pageWidth - 15, y);

      y += 4;
      const filledCount = fields.filter(
        (f) => prefilledData[f.key] !== null && prefilledData[f.key] !== undefined && prefilledData[f.key] !== "",
      ).length;
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`Progress: ${filledCount}/${fields.length} fields filled`, 15, y);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [formName, formCode, fields, prefilledData, clientName, previewUrl]);

  const downloadPdf = useCallback(() => {
    if (!previewUrl) {
      generatePreview();
      return;
    }
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `${formCode}_${clientName?.replace(/\s+/g, "_") ?? "form"}.pdf`;
    link.click();
  }, [previewUrl, generatePreview, formCode, clientName]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          PDF Preview
        </h2>
        <div className="flex gap-2">
          <button
            onClick={generatePreview}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Eye className="h-3.5 w-3.5" />
            {isGenerating ? "Generating..." : "Preview"}
          </button>
          <button
            onClick={downloadPdf}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900">
        {previewUrl ? (
          <object
            data={previewUrl}
            type="application/pdf"
            className="h-full w-full"
            aria-label="PDF preview"
          >
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm text-zinc-500">
                PDF preview not available
              </p>
              <button
                onClick={downloadPdf}
                className="mt-2 text-xs text-blue-600 underline hover:text-blue-700"
              >
                Download PDF instead
              </button>
            </div>
          </object>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <FileText className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              No preview generated yet
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Click &quot;Preview&quot; to generate a PDF preview
            </p>
            <button
              onClick={generatePreview}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Eye className="h-3.5 w-3.5" />
              Generate Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
