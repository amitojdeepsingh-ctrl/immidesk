import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, name, email, phone, startTime, endTime, consultantId, title } = body;

    if (!slug || !name || !email || !startTime || !endTime || !consultantId) {
      return errorResponse("MISSING_FIELDS", "Missing required fields", null, 400);
    }

    const { data: org } = await getSupabaseAdmin()
      .from("Organization")
      .select("id, name")
      .eq("slug", slug)
      .single();

    if (!org) return errorResponse("NOT_FOUND", "Organization not found", null, 404);

    const { data: existing } = await getSupabaseAdmin()
      .from("Consultation")
      .select("id")
      .eq("consultant_id", consultantId)
      .eq("start_time", startTime)
      .eq("status", "SCHEDULED")
      .maybeSingle();

    if (existing) return errorResponse("SLOT_TAKEN", "This time slot is already booked", null, 409);

    const roomName = `consultation_${org.id}_${Date.now()}`;

    const { data, error } = await getSupabaseAdmin()
      .from("Consultation")
      .insert({
        organization_id: org.id,
        consultant_id: consultantId,
        title: title ?? `Consultation with ${name}`,
        lead_name: name,
        lead_email: email,
        lead_phone: phone ?? null,
        start_time: startTime,
        end_time: endTime,
        status: "SCHEDULED",
        room_name: roomName,
      })
      .select()
      .single();

    if (error) throw error;
    return successResponse(data, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
