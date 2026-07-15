import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { organization } = await requireAuth();
    const { data: subscription, error } = await getSupabaseAdmin()
      .from("Subscription")
      .select("*")
      .eq("organizationId", organization.id)
      .maybeSingle();

    if (error) throw new AppError("QUERY_FAILED", error.message, 500);

    return successResponse({
      subscription: subscription ?? null,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
