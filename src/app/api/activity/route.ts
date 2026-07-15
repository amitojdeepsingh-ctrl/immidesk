import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
    const perPage = Math.min(Math.max(parseInt(searchParams.get("perPage") ?? "20"), 1), 100);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let query = supabase
      .from("ActivityLog")
      .select("*", { count: "exact" })
      .eq("organizationId", organization.id)
      .order("timestamp", { ascending: false });

    if (userId) query = query.eq("userId", userId);
    if (action) query = query.ilike("action", `%${action}%`);
    if (entityType) query = query.eq("entityType", entityType);
    if (dateFrom) query = query.gte("timestamp", `${dateFrom}T00:00:00Z`);
    if (dateTo) query = query.lte("timestamp", `${dateTo}T23:59:59Z`);

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await query.range(from, to);
    if (error) throw new AppError("QUERY_FAILED", error.message, 500);

    const userIds = [...new Set((data ?? []).map((d: Record<string, unknown>) => d.userId as string).filter(Boolean))];
    const { data: users } = await supabase
      .from("User")
      .select("id, name")
      .in("id", userIds.length > 0 ? userIds : ["__none__"]);
    const userMap = Object.fromEntries((users ?? []).map((u: Record<string, unknown>) => [u.id, u.name]));

    const { data: orgUsers } = await supabase
      .from("User")
      .select("id, name")
      .eq("organizationId", organization.id)
      .order("name", { ascending: true });

    const logs = (data ?? []).map((d: Record<string, unknown>) => ({
      ...d,
      userName: userMap[d.userId as string] ?? "Unknown",
    }));

    const totalPages = Math.ceil((count ?? 0) / perPage);

    return successResponse(
      { logs, users: orgUsers ?? [] },
      200,
      { page, perPage, totalCount: count ?? 0, totalPages },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
