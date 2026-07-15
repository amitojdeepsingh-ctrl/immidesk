import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const caseTypeEnum = z.enum([
  "EXPRESS_ENTRY", "PNP", "STUDY_PERMIT", "WORK_PERMIT",
  "LMIA_BASED_WORK_PERMIT", "LMIA_EXEMPT_WORK_PERMIT", "VISITOR_VISA",
  "FAMILY_SPONSORSHIP", "SPOUSAL_SPONSORSHIP", "SPOUSAL_OWP", "SUPER_VISA",
  "TRP", "REFUGEE", "PRRA", "HC", "VULNERABLE_WORKER", "CITIZENSHIP",
  "BUSINESS_INVESTMENT", "RESTORATION_VISITOR", "OTHER",
]);

const upsertSchema = z.object({
  caseType: caseTypeEnum,
  documentTemplates: z.array(z.object({
    name: z.string().min(1),
    typeCode: z.string().min(1),
    required: z.boolean(),
    order: z.number().int().min(0),
  })).optional().default([]),
  caseStages: z.array(z.object({
    name: z.string().min(1),
    order: z.number().int().min(0),
    color: z.string().min(1),
  })).optional().default([]),
});

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const caseType = searchParams.get("caseType");

    let query = getSupabaseAdmin()
      .from("CaseTypeConfig")
      .select("*")
      .eq("organizationId", organization.id);

    if (caseType) {
      query = query.eq("caseType", caseType);
      const { data, error } = await query.single();
      if (error || !data) return errorResponse("NOT_FOUND", "Case type config not found", null, 404);
      return successResponse(data);
    }

    query = query.order("caseType", { ascending: true });
    const { data, error } = await query;
    if (error) throw new AppError("QUERY_FAILED", error.message, 500);
    return successResponse(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const parsed = upsertSchema.parse(body);

    const { data: existing } = await supabase
      .from("CaseTypeConfig")
      .select("id")
      .eq("organizationId", organization.id)
      .eq("caseType", parsed.caseType)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("CaseTypeConfig")
        .update({
          documentTemplates: JSON.stringify(parsed.documentTemplates),
          caseStages: JSON.stringify(parsed.caseStages),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new AppError("UPDATE_FAILED", error.message, 500);
      return successResponse(data);
    }

    const { data, error } = await supabase
      .from("CaseTypeConfig")
      .insert({
        organizationId: organization.id,
        caseType: parsed.caseType,
        documentTemplates: JSON.stringify(parsed.documentTemplates),
        caseStages: JSON.stringify(parsed.caseStages),
      })
      .select()
      .single();
    if (error) throw new AppError("INSERT_FAILED", error.message, 500);
    return successResponse(data, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
