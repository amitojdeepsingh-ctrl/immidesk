import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError, AppError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const orgId = organization.id;

    const dateFilter = from && to ? { gte: from, lte: to } : null;

    const { data: allCases } = await supabase
      .from("Case")
      .select("id, status, caseType, submissionDate, createdAt")
      .eq("organizationId", orgId);

    if (!allCases) throw new AppError("QUERY_FAILED", "Failed to fetch cases", 500);

    const totalCases = allCases.length;
    const activeStatuses = ["INTAKE", "DOCUMENT_COLLECTION", "FORM_FILLING", "READY_TO_SUBMIT", "SUBMITTED", "AOR_RECEIVED", "IN_PROCESS", "ADDITIONAL_DOCS_REQUESTED"];
    const activeCases = allCases.filter((c: Record<string, unknown>) => activeStatuses.includes(c.status as string)).length;

    const casesByStatus: Record<string, number> = {};
    const casesByStream: Record<string, number> = {};
    for (const c of allCases) {
      const s = c.status as string;
      casesByStatus[s] = (casesByStatus[s] ?? 0) + 1;
      const st = c.caseType as string;
      casesByStream[st] = (casesByStream[st] ?? 0) + 1;
    }

    let avgDaysToSubmission = 0;
    const submitted = allCases.filter((c: Record<string, unknown>) => c.submissionDate);
    if (submitted.length > 0) {
      const totalDays = submitted.reduce((sum: number, c: Record<string, unknown>) => {
        const created = new Date(c.createdAt as string);
        const submitted = new Date(c.submissionDate as string);
        return sum + Math.round((submitted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      avgDaysToSubmission = Math.round((totalDays / submitted.length) * 10) / 10;
    }

    const { data: payments } = await supabase
      .from("Payment")
      .select("amount, paymentDate, clientId")
      .eq("organizationId", orgId);

    const totalRevenue = (payments ?? []).reduce((sum: number, p: Record<string, unknown>) => sum + Number(p.amount ?? 0), 0);

    const { data: agreements } = await supabase
      .from("ServiceAgreement")
      .select("id, feeAmount, status")
      .eq("organizationId", orgId);

    const outstandingTotal = (agreements ?? [])
      .filter((a: Record<string, unknown>) => a.status !== "SIGNED" && a.status !== "DRAFT")
      .reduce((sum: number, a: Record<string, unknown>) => sum + Number(a.feeAmount ?? 0), 0);

    const signedCount = (agreements ?? []).filter((a: Record<string, unknown>) => a.status === "SIGNED").length;
    const invoiceCollectionRate = agreements && agreements.length > 0
      ? Math.round((signedCount / agreements.length) * 1000) / 10
      : 0;

    const { data: orgCases } = await supabase
      .from("Case")
      .select("id")
      .eq("organizationId", orgId);
    const caseIds = (orgCases ?? []).map((c: Record<string, unknown>) => c.id);

    let taskCompletionRate = 0;
    let overdueTasks = 0;
    if (caseIds.length > 0) {
      const { data: tasks } = await supabase
        .from("Task")
        .select("completedAt, dueDate")
        .in("caseId", caseIds);

      const allTasks = tasks ?? [];
      const completed = allTasks.filter((t: Record<string, unknown>) => t.completedAt).length;
      taskCompletionRate = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 1000) / 10 : 0;

      const now = new Date().toISOString();
      overdueTasks = allTasks.filter((t: Record<string, unknown>) => !t.completedAt && t.dueDate && t.dueDate < now).length;
    }

    const { data: users } = await supabase
      .from("User")
      .select("id, name")
      .eq("organizationId", orgId);
    const userIds = (users ?? []).map((u: Record<string, unknown>) => u.id);

    const workloadByConsultant: Array<Record<string, unknown>> = [];
    if (userIds.length > 0) {
      const { data: caseAssignments } = await supabase
        .from("Case")
        .select("assignedToId")
        .eq("organizationId", orgId)
        .in("assignedToId", userIds);

      const { data: taskAssignments } = await supabase
        .from("Task")
        .select("assignedToId, completedAt")
        .in("assignedToId", userIds);

      for (const u of users ?? []) {
        const userId = u.id as string;
        const assignedCases = (caseAssignments ?? []).filter((c: Record<string, unknown>) => c.assignedToId === userId).length;
        const userTasks = (taskAssignments ?? []).filter((t: Record<string, unknown>) => t.assignedToId === userId);
        const pendingTasks = userTasks.filter((t: Record<string, unknown>) => !t.completedAt).length;
        workloadByConsultant.push({
          consultantId: userId,
          consultantName: u.name,
          assignedCases,
          pendingTasks,
          totalTasks: userTasks.length,
        });
      }
    }

    return successResponse({
      totalCases,
      activeCases,
      casesByStatus,
      casesByStream,
      avgDaysToSubmission,
      invoiceCollectionRate,
      totalRevenue,
      outstandingInvoices: outstandingTotal,
      taskCompletionRate,
      overdueTasks,
      workloadByConsultant,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
