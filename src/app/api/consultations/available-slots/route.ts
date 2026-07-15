import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const date = searchParams.get("date");

    if (!slug) return errorResponse("MISSING_SLUG", "Organization slug is required", null, 400);

    const { data: org } = await getSupabaseAdmin()
      .from("Organization")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!org) return errorResponse("NOT_FOUND", "Organization not found", null, 404);

    const { data: rules } = await getSupabaseAdmin()
      .from("AvailabilityRule")
      .select("*, user:User(id, name)")
      .eq("organization_id", org.id)
      .eq("is_active", true);

    if (!rules || rules.length === 0) {
      return successResponse({ slots: [], consultants: [] });
    }

    const consultantMap = new Map<string, { id: string; name: string }>();
    for (const r of rules) {
      if (r.user?.id) consultantMap.set(r.user.id, { id: r.user.id, name: r.user.name ?? "Consultant" });
    }
    const consultants = Array.from(consultantMap.values());

    let slots: Array<{ date: string; startTime: string; endTime: string; consultantId: string; consultantName: string }> = [];

    if (date) {
      const dayOfWeek = new Date(date).getDay();

      for (const rule of rules) {
        if (rule.day_of_week !== dayOfWeek) continue;

        const [startH, startM] = rule.start_time.split(":").map(Number);
        const [endH, endM] = rule.end_time.split(":").map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        const dur = rule.slot_duration ?? 30;

        const consultant = consultantMap.get(rule.user_id);

        for (let m = startMin; m + dur <= endMin; m += dur) {
          const hh = String(Math.floor(m / 60)).padStart(2, "0");
          const mm = String(m % 60).padStart(2, "0");
          const ehh = String(Math.floor((m + dur) / 60)).padStart(2, "0");
          const emm = String((m + dur) % 60).padStart(2, "0");

          slots.push({
            date,
            startTime: `${hh}:${mm}`,
            endTime: `${ehh}:${emm}`,
            consultantId: rule.user_id,
            consultantName: consultant?.name ?? "Consultant",
          });
        }
      }

      // Filter out past time slots if date is today
      const now = new Date();
      if (date === now.toISOString().slice(0, 10)) {
        const currentMin = now.getHours() * 60 + now.getMinutes();
        slots = slots.filter(s => {
          const [sh, sm] = s.startTime.split(":").map(Number);
          return sh * 60 + sm > currentMin;
        });
      }
    }

    return successResponse({ slots, consultants });
  } catch (err) {
    return handleApiError(err);
  }
}
