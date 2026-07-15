import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const statusEnum = z.enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "ARCHIVED"]);

const moveSchema = z.object({
  leadId: z.string().min(1),
  status: statusEnum,
});

export async function GET() {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const { data: leads, error } = await supabase
      .from("IntakeSubmission")
      .select("*")
      .eq("organizationId", organization.id)
      .order("submittedAt", { ascending: false });

    if (error) throw new AppError("QUERY_FAILED", error.message, 500);

    const grouped: Record<string, unknown[]> = {
      NEW: [],
      CONTACTED: [],
      QUALIFIED: [],
      CONVERTED: [],
      ARCHIVED: [],
    };

    for (const lead of leads ?? []) {
      const status = (lead.status as string) ?? "NEW";
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(lead);
    }

    return successResponse(grouped);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { organization, prismaUser } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const parsed = moveSchema.parse(body);

    const { data: existing } = await supabase
      .from("IntakeSubmission")
      .select("id, status")
      .eq("id", parsed.leadId)
      .eq("organizationId", organization.id)
      .single();

    if (!existing) return errorResponse("NOT_FOUND", "Lead not found", null, 404);

    const { data: lead, error } = await supabase
      .from("IntakeSubmission")
      .update({ status: parsed.status })
      .eq("id", parsed.leadId)
      .select()
      .single();

    if (error) throw new AppError("UPDATE_FAILED", error.message, 500);

    await supabase
      .from("ActivityLog")
      .insert({
        organizationId: organization.id,
        userId: prismaUser.id,
        action: "LEAD_STATUS_CHANGED",
        entityType: "IntakeSubmission",
        entityId: parsed.leadId,
        metadata: { from: existing.status, to: parsed.status },
      });

    return successResponse(lead);
  } catch (err) {
    return handleApiError(err);
  }
}
