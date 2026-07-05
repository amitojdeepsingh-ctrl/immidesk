import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { prismaUser } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const { data: notifications, error } = await supabase
      .from("Notification")
      .select("*")
      .eq("userId", prismaUser.id)
      .order("createdAt", { ascending: false })
      .limit(20);

    if (error) return errorResponse("QUERY_FAILED", error.message, null, 500);

    const { count } = await supabase
      .from("Notification")
      .select("*", { count: "exact", head: true })
      .eq("userId", prismaUser.id)
      .eq("read", false);

    return successResponse({ notifications: notifications ?? [], unreadCount: count ?? 0 }, 200);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { prismaUser } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const { id, readAll } = await req.json();

    if (readAll) {
      await supabase.from("Notification").update({ read: true }).eq("userId", prismaUser.id).eq("read", false);
      return successResponse({ success: true }, 200);
    }

    if (!id) return errorResponse("MISSING_ID", "Missing id", null, 400);
    await supabase.from("Notification").update({ read: true }).eq("id", id).eq("userId", prismaUser.id);
    return successResponse({ success: true }, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
