import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";

export async function POST(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const body = await req.json();
    const { roomName, identity, name } = body;

    if (!roomName || !identity) {
      return errorResponse("MISSING_FIELDS", "roomName and identity are required", null, 400);
    }

    const apiKey = process.env["LIVEKIT_API_KEY"];
    const apiSecret = process.env["LIVEKIT_API_SECRET"];

    if (!apiKey || !apiSecret) {
      return errorResponse("NOT_CONFIGURED", "LiveKit is not configured", null, 503);
    }

    const { AccessToken } = await import("livekit-server-sdk");
    const at = new AccessToken(apiKey, apiSecret, { identity, name: name ?? identity });
    at.addGrant({ roomJoin: true, room: roomName });

    const token = at.toJwt();
    return successResponse({ token, roomName, identity });
  } catch (err) {
    return handleApiError(err);
  }
}
