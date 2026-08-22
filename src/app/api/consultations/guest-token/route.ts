import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";

/**
 * Public guest-token endpoint for booked consultations.
 * The consultation id in the URL acts as the capability — anyone holding
 * the confirmation link can join that one room, nothing else.
 */
export async function POST(req: NextRequest) {
  try {
    const { id, name } = await req.json();
    if (!id) return errorResponse("MISSING_ID", "Consultation id required", null, 400);

    const apiKey = process.env["LIVEKIT_API_KEY"];
    const apiSecret = process.env["LIVEKIT_API_SECRET"];
    if (!apiKey || !apiSecret) {
      return errorResponse("NOT_CONFIGURED", "Video meetings are not configured", null, 503);
    }

    const db = getSupabaseAdmin();
    const { data: consultation } = await db
      .from("Consultation")
      .select("id, room_name, status, start_time")
      .eq("id", id)
      .maybeSingle();

    if (!consultation?.room_name) {
      return errorResponse("NOT_FOUND", "Meeting not found", null, 404);
    }

    const { AccessToken } = await import("livekit-server-sdk");
    const identity = `guest_${id}_${Date.now().toString(36)}`;
    const at = new AccessToken(apiKey, apiSecret, { identity, name: name ?? "Guest" });
    at.addGrant({ roomJoin: true, room: consultation.room_name });

    return successResponse({ token: at.toJwt(), roomName: consultation.room_name, identity });
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
