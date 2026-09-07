import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";
import { pacificBookingInstant } from "@/lib/consultation-time";

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

    const { data: rules, error: rulesError } = await getSupabaseAdmin()
      .from("AvailabilityRule")
      .select("*, user:User(id, name)")
      .eq("organization_id", org.id)
      .eq("is_active", true);
    if (rulesError) throw rulesError;

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
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(`${date}T12:00:00Z`).getTime())) {
        return errorResponse("INVALID_DATE", "Choose a valid date", null, 422);
      }
      const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();

      for (const rule of rules) {
        if (rule.day_of_week !== dayOfWeek) continue;

        const [startH, startM] = rule.start_time.split(":").map(Number);
        const [endH, endM] = rule.end_time.split(":").map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        const dur = rule.slot_duration ?? 30;
        if (dur <= 0 || !Number.isFinite(dur)) continue;

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

      const dayStart = pacificBookingInstant(`${date}T00:00:00`);
      const nextDate = new Date(`${date}T12:00:00Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      const dayEnd = pacificBookingInstant(`${nextDate.toISOString().slice(0, 10)}T00:00:00`);
      const { data: bookings, error: bookingsError } = await getSupabaseAdmin().from("Consultation")
        .select("consultant_id, start_time, end_time").eq("organization_id", org.id)
        .in("status", ["SCHEDULED", "IN_PROGRESS"]).lt("start_time", dayEnd).gt("end_time", dayStart);
      if (bookingsError) throw bookingsError;
      slots = slots.filter(slot => {
        try {
          const start = Date.parse(pacificBookingInstant(`${date}T${slot.startTime}:00`));
          const end = Date.parse(pacificBookingInstant(`${date}T${slot.endTime}:00`));
          return start > Date.now() && !(bookings ?? []).some(b => b.consultant_id === slot.consultantId
            && Date.parse(b.start_time) < end && Date.parse(b.end_time) > start);
        } catch { return false; }
      });
    }

    return successResponse({ slots, consultants });
  } catch (err) {
    return handleApiError(err);
  }
}
