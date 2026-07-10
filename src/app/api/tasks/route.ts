import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const createSchema = z.object({
  caseId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function GET() {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const orgId = organization.id;

    const { data: orgCases } = await supabase
      .from("Case")
      .select("id")
      .eq("organizationId", orgId);
    const caseIds = (orgCases ?? []).map(c => c.id);
    if (caseIds.length === 0) return successResponse([]);

    const { data: tasks, error } = await supabase
      .from("Task")
      .select("id, caseId, title, description, dueDate, completedAt, createdAt, assignedToId, case:Case!inner(id, title, clientId)")
      .in("caseId", caseIds)
      .order("createdAt", { ascending: false });

    if (error) throw new AppError("QUERY_ERROR", error.message, 500);
    return successResponse(tasks ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const body = await req.json();
    const parsed = createSchema.parse(body);

    const { data: task, error } = await supabase
      .from("Task")
      .insert({
        caseId: parsed.caseId,
        title: parsed.title,
        description: parsed.description ?? null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate).toISOString() : null,
        assignedToId: parsed.assignedToId ?? null,
      })
      .select()
      .single();

    if (error) throw new AppError("INSERT_ERROR", error.message, 500);
    return successResponse(task, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
