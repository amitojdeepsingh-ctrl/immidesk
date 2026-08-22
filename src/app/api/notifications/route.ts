import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";

/**
 * Lazily generate deadline notifications for the org's active cases.
 * Runs on every bell fetch (no cron needed) but dedupes so each
 * case×deadline-bucket creates at most one unread notification.
 */
async function syncDeadlineNotifications(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  userId: string,
): Promise<void> {
  try {
    const horizon = new Date(Date.now() + 14 * 86400_000).toISOString();
    const { data: cases } = await supabase
      .from("Case")
      .select("id, title, deadlineDate, status")
      .eq("organizationId", organizationId)
      .not("deadlineDate", "is", null)
      .not("status", "in", "(CLOSED,APPROVED,REFUSED)")
      .lte("deadlineDate", horizon)
      .order("deadlineDate", { ascending: true })
      .limit(50);

    if (!cases?.length) return;

    for (const c of cases) {
      const due = new Date(c.deadlineDate as string);
      const days = Math.ceil((due.getTime() - Date.now()) / 86400_000);
      const title =
        days < 0
          ? `OVERDUE ${Math.abs(days)}d — ${c.title}`
          : days === 0
            ? `DUE TODAY — ${c.title}`
            : `Deadline in ${days}d — ${c.title}`;

      // Dedupe: skip if this exact title already exists unread for the user
      const { data: existing } = await supabase
        .from("Notification")
        .select("id")
        .eq("userId", userId)
        .eq("title", title)
        .maybeSingle();
      if (existing) continue;

      await supabase.from("Notification").insert({
        userId,
        title,
        message:
          days < 0
            ? `This case passed its deadline ${Math.abs(days)} day(s) ago.`
            : `Case deadline is ${due.toLocaleDateString("en-CA")}.`,
        link: `/cases/${c.id}`,
      });
    }
  } catch (e) {
    console.warn("Deadline notification sync failed:", e);
  }
}

export async function GET() {
  try {
    const { prismaUser, organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    await syncDeadlineNotifications(supabase, organization.id, prismaUser.id);

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
