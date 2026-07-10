import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const saveSchema = z.object({
  caseId: z.string().min(1),
  score: z.number().int().min(0).max(1200),
  breakdown: z.any(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const orgId = organization.id;

    const { data: orgCases } = await supabase.from("Case").select("id").eq("organizationId", orgId);
    const caseIds = (orgCases ?? []).map(c => c.id);
    if (caseIds.length === 0) return successResponse([]);

    const { data: scores, error } = await supabase
      .from("CRSScore")
      .select("id, caseId, score, breakdown, notes, calculatedAt, case:Case!inner(id, title, clientId)")
      .in("caseId", caseIds)
      .order("calculatedAt", { ascending: false });

    if (error) throw new AppError("QUERY_ERROR", error.message, 500);
    return successResponse(scores ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const parsed = saveSchema.parse(body);

    const { data: score, error } = await supabase
      .from("CRSScore")
      .insert({ caseId: parsed.caseId, score: parsed.score, breakdown: parsed.breakdown, notes: parsed.notes ?? null })
      .select()
      .single();

    if (error) throw new AppError("INSERT_ERROR", error.message, 500);
    return successResponse(score, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
