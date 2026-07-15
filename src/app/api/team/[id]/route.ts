import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const roleEnum = z.enum(["OWNER", "ADMIN", "CONSULTANT", "ASSISTANT", "AUDITOR"]);
const updateSchema = z.object({ role: roleEnum });

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const { id } = await context.params;

    const { data: target } = await supabase
      .from("User")
      .select("id, role")
      .eq("id", id)
      .eq("organizationId", organization.id)
      .single();

    if (!target) return errorResponse("NOT_FOUND", "User not found in your organization", null, 404);

    const body = await req.json();
    const parsed = updateSchema.parse(body);

    const { data: user, error } = await supabase
      .from("User")
      .update({ role: parsed.role })
      .eq("id", id)
      .select("id, email, name, phone, role, avatarUrl, lastLoginAt, createdAt")
      .single();

    if (error) throw new AppError("UPDATE_FAILED", error.message, 500);
    return successResponse(user);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { organization, prismaUser } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const { id } = await context.params;

    if (id === prismaUser.id) {
      return errorResponse("SELF_REMOVE", "You cannot remove yourself from the organization", null, 400);
    }

    const { data: target } = await supabase
      .from("User")
      .select("id, role")
      .eq("id", id)
      .eq("organizationId", organization.id)
      .single();

    if (!target) return errorResponse("NOT_FOUND", "User not found in your organization", null, 404);

    const { error } = await supabase.from("User").delete().eq("id", id);
    if (error) throw new AppError("DELETE_FAILED", error.message, 500);
    return successResponse({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
