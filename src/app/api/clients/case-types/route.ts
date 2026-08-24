import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api/errors";

/** Latest case type per client — powers the checklist picker. */
export async function GET() {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const { data: cases, error } = await supabase
      .from("Case")
      .select("clientId, caseType, createdAt")
      .eq("organizationId", organization.id)
      .order("createdAt", { ascending: false });

    if (error) throw new (await import("@/lib/api/errors")).AppError("QUERY_FAILED", error.message, 500);

    const latest = new Map<string, string>();
    for (const c of cases ?? []) {
      if (!latest.has(c.clientId as string)) {
        latest.set(c.clientId as string, c.caseType as string);
      }
    }

    return successResponse(
      Array.from(latest.entries()).map(([clientId, caseType]) => ({ clientId, caseType })),
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
