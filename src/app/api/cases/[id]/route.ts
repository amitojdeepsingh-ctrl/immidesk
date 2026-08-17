import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const updateSchema = z.object({
  status: z.string().min(1),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organization } = await requireAuth();
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const body = await req.json();
    const { status } = updateSchema.parse(body);

    const update: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };

    if (status === "SUBMITTED") {
      update.submissionDate = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("Case")
      .update(update)
      .eq("id", id)
      .eq("organizationId", organization.id)
      .select()
      .single();

    if (error) throw new AppError("UPDATE_FAILED", error.message, 500);
    if (!data) throw new AppError("NOT_FOUND", "Case not found", 404);

    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
