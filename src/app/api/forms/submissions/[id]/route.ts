// ---------------------------------------------------------------------------
// PATCH /api/forms/submissions/[id] — Update form submission (save draft / complete)
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organization } = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    // Verify submission exists and belongs to org (via case)
    const { data: sub, error: subErr } = await supabase
      .from("IMMFormSubmission")
      .select("id, case:Case!inner(organizationId)")
      .eq("id", id)
      .single();

    if (subErr || !sub) {
      throw new AppError("SUBMISSION_NOT_FOUND", "Form submission not found", 404);
    }

    const subCase = sub.case as unknown as { organizationId: string };
    if (subCase.organizationId !== organization.id) {
      throw new AppError("FORBIDDEN", "Not authorized to modify this submission", 403);
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.filledData !== undefined) {
      updates.filledData = body.filledData;
    }

    if (body.status === "COMPLETE") {
      updates.status = "COMPLETE";
      updates.submittedAt = new Date().toISOString();
    } else if (body.status === "DRAFT") {
      updates.status = "DRAFT";
    }

    const { error: updateErr } = await supabase
      .from("IMMFormSubmission")
      .update(updates)
      .eq("id", id);

    if (updateErr) throw updateErr;

    return successResponse({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
