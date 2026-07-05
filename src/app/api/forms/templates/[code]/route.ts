// ---------------------------------------------------------------------------
// GET /api/forms/templates/[code] — Get a single form template by code
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    await requireAuth();
    const { code } = await params;
    const supabase = getSupabaseAdmin();

    const { data: template, error } = await supabase
      .from("IMMFormTemplate")
      .select("*")
      .eq("formCode", code)
      .eq("isActive", true)
      .single();

    if (error || !template) {
      throw new AppError("TEMPLATE_NOT_FOUND", `Form template "${code}" not found`, 404);
    }

    return successResponse(template);
  } catch (err) {
    return handleApiError(err);
  }
}
