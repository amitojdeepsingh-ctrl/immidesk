// ---------------------------------------------------------------------------
// GET /api/forms/templates — List active IMM form templates
// ---------------------------------------------------------------------------
// Auth: Session required. Scoped to user's organization.
// Returns: { data: IMMFormTemplate[], meta, error }
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api/errors";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(50),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const supabase = getSupabaseAdmin();

    const url = new URL(req.url);
    const query = querySchema.parse(Object.fromEntries(url.searchParams));
    const { page, perPage } = query;

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data: templates, error, count } = await supabase
      .from("IMMFormTemplate")
      .select("*", { count: "exact" })
      .eq("isActive", true)
      .order("formName", { ascending: true })
      .range(from, to);

    if (error) throw error;

    return successResponse(templates ?? [], 200, {
      page,
      perPage,
      totalCount: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / perPage),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
