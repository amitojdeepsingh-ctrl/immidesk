import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { errorResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const exportTypeSchema = z.enum(["cases", "clients", "invoices", "tasks", "prospects", "audit"]);

function toCsvRow(values: unknown[]): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(",");
}

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const typeRaw = searchParams.get("type") ?? "cases";
    const type = exportTypeSchema.parse(typeRaw);

    let csv = "";
    let filename = "";

    switch (type) {
      case "cases": {
        const { data } = await supabase
          .from("Case")
          .select("id, title, caseType, status, priority, createdAt, submissionDate, decisionDate")
          .eq("organizationId", organization.id)
          .order("createdAt", { ascending: false });
        const rows = data ?? [];
        csv = [
          toCsvRow(["ID", "Title", "Case Type", "Status", "Priority", "Created At", "Submission Date", "Decision Date"]),
          ...rows.map((r: Record<string, unknown>) => toCsvRow([r.id, r.title, r.caseType, r.status, r.priority, r.createdAt, r.submissionDate ?? "", r.decisionDate ?? ""])),
        ].join("\n");
        filename = "cases.csv";
        break;
      }
      case "clients": {
        const { data } = await supabase
          .from("Client")
          .select("id, firstName, lastName, email, phone, nationality, createdAt")
          .eq("organizationId", organization.id)
          .order("createdAt", { ascending: false });
        const rows = data ?? [];
        csv = [
          toCsvRow(["ID", "First Name", "Last Name", "Email", "Phone", "Nationality", "Created At"]),
          ...rows.map((r: Record<string, unknown>) => toCsvRow([r.id, r.firstName, r.lastName, r.email, r.phone ?? "", r.nationality ?? "", r.createdAt])),
        ].join("\n");
        filename = "clients.csv";
        break;
      }
      case "invoices": {
        const { data } = await supabase
          .from("Payment")
          .select("id, amount, currency, paymentMethod, paymentDate, receiptNumber, notes")
          .eq("organizationId", organization.id)
          .order("paymentDate", { ascending: false });
        const rows = data ?? [];
        csv = [
          toCsvRow(["ID", "Amount", "Currency", "Payment Method", "Payment Date", "Receipt Number", "Notes"]),
          ...rows.map((r: Record<string, unknown>) => toCsvRow([r.id, r.amount, r.currency, r.paymentMethod, r.paymentDate, r.receiptNumber ?? "", r.notes ?? ""])),
        ].join("\n");
        filename = "payments.csv";
        break;
      }
      case "tasks": {
        const { data: orgCases } = await supabase
          .from("Case")
          .select("id")
          .eq("organizationId", organization.id);
        const caseIds = (orgCases ?? []).map((c: Record<string, unknown>) => c.id);
        if (caseIds.length === 0) {
          csv = toCsvRow(["ID", "Case ID", "Title", "Description", "Due Date", "Completed At", "Assigned To", "Created At"]);
        } else {
          const { data } = await supabase
            .from("Task")
            .select("id, caseId, title, description, dueDate, completedAt, assignedToId, createdAt")
            .in("caseId", caseIds)
            .order("createdAt", { ascending: false });
          const rows = data ?? [];
          csv = [
            toCsvRow(["ID", "Case ID", "Title", "Description", "Due Date", "Completed At", "Assigned To", "Created At"]),
            ...rows.map((r: Record<string, unknown>) => toCsvRow([r.id, r.caseId, r.title, r.description ?? "", r.dueDate ?? "", r.completedAt ?? "", r.assignedToId ?? "", r.createdAt])),
          ].join("\n");
        }
        filename = "tasks.csv";
        break;
      }
      case "prospects": {
        const { data } = await supabase
          .from("IntakeSubmission")
          .select("id, firstName, lastName, email, phone, nationality, programType, status, submittedAt")
          .eq("organizationId", organization.id)
          .order("submittedAt", { ascending: false });
        const rows = data ?? [];
        csv = [
          toCsvRow(["ID", "First Name", "Last Name", "Email", "Phone", "Nationality", "Program Type", "Status", "Submitted At"]),
          ...rows.map((r: Record<string, unknown>) => toCsvRow([r.id, r.first_name ?? r.firstName, r.last_name ?? r.lastName, r.email, r.phone ?? "", r.nationality ?? "", r.program_type ?? r.programType ?? "", r.status, r.submitted_at ?? r.submittedAt])),
        ].join("\n");
        filename = "prospects.csv";
        break;
      }
      case "audit": {
        const { data } = await supabase
          .from("ActivityLog")
          .select("id, action, entityType, entityId, userId, timestamp, metadata")
          .eq("organizationId", organization.id)
          .order("timestamp", { ascending: false })
          .limit(5000);
        const rows = data ?? [];
        csv = [
          toCsvRow(["ID", "Action", "Entity Type", "Entity ID", "User ID", "Timestamp", "Metadata"]),
          ...rows.map((r: Record<string, unknown>) => toCsvRow([r.id, r.action, r.entityType, r.entityId, r.userId, r.timestamp, JSON.stringify(r.metadata ?? {})])),
        ].join("\n");
        filename = "audit-log.csv";
        break;
      }
    }

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
