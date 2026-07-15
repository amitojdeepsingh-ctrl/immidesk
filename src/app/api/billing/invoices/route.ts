import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { organization } = await requireAuth();
    const { data: payments, error } = await getSupabaseAdmin()
      .from("Payment")
      .select("*, client:Client(id, firstName, lastName, email), agreement:ServiceAgreement(id, title)")
      .eq("organizationId", organization.id)
      .order("paymentDate", { ascending: false });

    if (error) throw new AppError("QUERY_FAILED", error.message, 500);
    return successResponse(payments ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}
