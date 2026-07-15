import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const consultantId = searchParams.get("consultantId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = getSupabaseAdmin()
      .from("Consultation")
      .select("*, consultant:User!consultant_id(id, name, email), client:Client(id, firstName, lastName)")
      .eq("organization_id", organization.id)
      .order("start_time", { ascending: false });

    if (status) query = query.eq("status", status);
    if (consultantId) query = query.eq("consultant_id", consultantId);
    if (from) query = query.gte("start_time", from);
    if (to) query = query.lte("end_time", to);

    const { data, error } = await query;
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
      .from("Consultation")
      .insert({
        organization_id: organization.id,
        consultant_id: body.consultantId ?? prismaUser.id,
        client_id: body.clientId ?? null,
        title: body.title,
        description: body.description ?? null,
        start_time: body.startTime,
        end_time: body.endTime,
        status: "SCHEDULED",
        room_name: `consultation_${organization.id}_${Date.now()}`,
      })
      .select()
      .single();

    if (error) throw error;
    return successResponse(data, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
