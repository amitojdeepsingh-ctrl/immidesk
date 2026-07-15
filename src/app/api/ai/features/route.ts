import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const featureTypeEnum = z.enum([
  "DOCUMENT_ANALYST", "COMMUNICATION_DRAFTER", "CASE_ASSESSOR",
  "FORM_AUTO_FILLER", "SUBMISSIONS_WRITER", "KNOWLEDGE_ASSISTANT",
  "COMPLIANCE_MONITOR",
]);

const toggleSchema = z.object({
  featureType: featureTypeEnum,
  enabled: z.boolean(),
});

export async function GET() {
  try {
    const { organization } = await requireAuth();
    const { data: features, error } = await getSupabaseAdmin()
      .from("AiFeatureConfig")
      .select("*")
      .eq("organizationId", organization.id)
      .order("featureType", { ascending: true });

    if (error) throw new AppError("QUERY_FAILED", error.message, 500);
    return successResponse(features ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const parsed = toggleSchema.parse(body);

    const { data: existing } = await supabase
      .from("AiFeatureConfig")
      .select("id")
      .eq("organizationId", organization.id)
      .eq("featureType", parsed.featureType)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("AiFeatureConfig")
        .update({ enabled: parsed.enabled })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new AppError("UPDATE_FAILED", error.message, 500);
      return successResponse(data);
    }

    const { data, error } = await supabase
      .from("AiFeatureConfig")
      .insert({
        organizationId: organization.id,
        featureType: parsed.featureType,
        enabled: parsed.enabled,
        settings: {},
      })
      .select()
      .single();
    if (error) throw new AppError("INSERT_FAILED", error.message, 500);
    return successResponse(data, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
