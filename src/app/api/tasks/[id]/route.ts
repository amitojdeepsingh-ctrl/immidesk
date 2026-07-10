import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError, AppError } from "@/lib/api/errors";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const supabase = getSupabaseAdmin();
    const { id } = await params;

    const body = await req.json();
    const allowed: Record<string, unknown> = {};
    if (body.title !== undefined) allowed.title = body.title;
    if (body.description !== undefined) allowed.description = body.description;
    if (body.dueDate !== undefined) allowed.dueDate = body.dueDate ? new Date(body.dueDate).toISOString() : null;
    if (body.completedAt !== undefined) allowed.completedAt = body.completedAt ? new Date().toISOString() : null;

    const { data: task, error } = await supabase
      .from("Task")
      .update(allowed)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new AppError("UPDATE_ERROR", error.message, 500);
    if (!task) throw new AppError("NOT_FOUND", "Task not found", 404);
    return successResponse(task);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const supabase = getSupabaseAdmin();
    const { id } = await params;

    const { error } = await supabase.from("Task").delete().eq("id", id);
    if (error) throw new AppError("DELETE_ERROR", error.message, 500);
    return successResponse({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
