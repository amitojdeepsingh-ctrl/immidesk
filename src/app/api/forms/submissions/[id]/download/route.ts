// ---------------------------------------------------------------------------
// GET /api/forms/submissions/[id]/download — Download filled form as PDF
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { handleApiError, AppError } from "@/lib/api/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: sub } = await supabase
      .from("IMMFormSubmission")
      .select("*, template:IMMFormTemplate(*), case:Case(*)")
      .eq("id", id)
      .single();

    if (!sub) {
      throw new AppError("SUBMISSION_NOT_FOUND", "Form submission not found", 404);
    }

    const subCase = sub.case as Record<string, unknown>;
    const subCaseClientId = subCase["clientId"] as string;

    const { data: client } = await supabase
      .from("Client")
      .select("firstName, lastName")
      .eq("id", subCaseClientId)
      .single();

    const template = sub.template as Record<string, unknown>;
    const filledData = sub.filledData as Record<string, unknown>;
    const rawSchema = template["fieldSchema"] as unknown;
    const fieldSchema = rawSchema as { fields: unknown[] } | unknown[];
    const fields = Array.isArray(fieldSchema) ? fieldSchema : (fieldSchema as { fields: unknown[] })?.fields ?? [];

    // Generate PDF with jspdf
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`${template["formCode"] as string}`, pageWidth - 10, y, { align: "right" });

    y += 8;
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text(`${template["formName"] as string}`, 15, y);

    y += 4;
    doc.setFontSize(7);
    doc.setTextColor(120);
    const clientName = client ? `${client.firstName} ${client.lastName}` : "Client";
    doc.text(`Generated for: ${clientName}`, 15, y);

    y += 10;
    doc.setFontSize(6.5);
    doc.text("FIELD", 15, y);
    doc.text("VALUE", 95, y);
    doc.setDrawColor(200);
    doc.line(15, y + 1, pageWidth - 15, y + 1);
    y += 6;

    for (const field of fields) {
      const f = field as { key: string; label: string; type: string };
      const value = filledData[f.key];
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
        doc.line(15, y + 1, pageWidth - 15, y + 1);
        y += 6;
      }

      doc.setFontSize(7);
      doc.setTextColor(isFilled ? 50 : 180);
      doc.text(f.label.length > 40 ? f.label.slice(0, 40) + "..." : f.label, 15, y);
      doc.setTextColor(isFilled ? 30 : 200);
      doc.text(displayValue, 95, y);
      y += 4.5;
    }

    y += 4;
    doc.setDrawColor(200);
    doc.line(15, y, pageWidth - 15, y);

    const pdfBytes = doc.output("arraybuffer");

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${template["formCode"] as string}_${clientName.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
