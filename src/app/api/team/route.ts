import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { organization } = await requireAuth();
    const { data: users, error } = await getSupabaseAdmin()
      .from("User")
      .select("id, email, name, phone, role, avatarUrl, lastLoginAt, createdAt")
      .eq("organizationId", organization.id)
      .order("name", { ascending: true });

    if (error) throw new AppError("QUERY_FAILED", error.message, 500);
    return successResponse(users ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}
