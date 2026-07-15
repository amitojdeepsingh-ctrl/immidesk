import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { prismaUser, organization } = await requireAuth();
    const { data, error } = await getSupabaseAdmin()
      .from("AvailabilityRule")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("user_id", prismaUser.id)
      .order("day_of_week", { ascending: true });
    if (error) throw error;
    return successResponse(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const body = await req.json();

    const { data, error } = await getSupabaseAdmin()
      .from("AvailabilityRule")
      .upsert({
        organization_id: organization.id,
        user_id: body.userId ?? prismaUser.id,
        day_of_week: body.dayOfWeek,
        start_time: body.startTime,
        end_time: body.endTime,
        slot_duration: body.slotDuration ?? 30,
        is_active: body.isActive ?? true,
      }, { onConflict: "user_id, day_of_week", ignoreDuplicates: false })
      .select()
      .single();

    if (error) throw error;
    return successResponse(data, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
