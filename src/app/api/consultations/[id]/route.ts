import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organization } = await requireAuth();
    const { id } = await params;
    const { data, error } = await getSupabaseAdmin()
      .from("Consultation")
      .select("*, consultant:User!consultant_id(id, name, email), client:Client(id, firstName, lastName)")
      .eq("id", id)
      .eq("organization_id", organization.id)
      .single();
    if (error || !data) return errorResponse("NOT_FOUND", "Consultation not found", null, 404);
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organization } = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.status) updates.status = body.status;
    if (body.title) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.startTime) updates.start_time = body.startTime;
    if (body.endTime) updates.end_time = body.endTime;
    if (body.meetingLink !== undefined) updates.meeting_link = body.meetingLink;

    const { data, error } = await getSupabaseAdmin()
      .from("Consultation")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", organization.id)
      .select()
      .single();

    if (error) return errorResponse("NOT_FOUND", "Consultation not found", null, 404);
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organization } = await requireAuth();
    const { id } = await params;
    const { error } = await getSupabaseAdmin()
      .from("Consultation")
      .delete()
      .eq("id", id)
      .eq("organization_id", organization.id);
    if (error) return errorResponse("NOT_FOUND", "Consultation not found", null, 404);
    return successResponse({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
