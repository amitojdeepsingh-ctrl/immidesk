import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
  AppError,
} from "@/lib/api/errors";
import { z } from "zod";

const createUpdateSchema = z.object({
  action: z.string().min(1, "Action is required").max(500),
  entityType: z.string().min(1, "Entity type is required").max(100),
  entityId: z.string().min(1, "Entity ID is required"),
  metadata: z.any().optional(),
});

const paginationSchema = z.object({
  page: z.string().optional().transform((v) => { const n = v ? parseInt(v, 10) : 1; return isNaN(n) || n < 1 ? 1 : n; }),
  perPage: z.string().optional().transform((v) => { const n = v ? parseInt(v, 10) : 20; if (isNaN(n) || n < 1) return 20; return Math.min(n, 100); }),
});

export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const validated = createUpdateSchema.parse(body);

    const { data: log, error } = await supabase
      .from("ActivityLog")
      .insert({
        organizationId: organization.id,
        userId: prismaUser.id,
        action: validated.action,
        entityType: validated.entityType,
        entityId: validated.entityId,
        metadata: validated.metadata ?? {},
      })
      .select("*, user:User(name, email)")
      .single();

    if (error) throw new AppError("INSERT_FAILED", error.message, 500);

    return successResponse(log, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const { page, perPage } = paginationSchema.parse(Object.fromEntries(searchParams));

    const { data: logs, count, error } = await supabase
      .from("ActivityLog")
      .select("*, user:User(name, email)", { count: "exact", head: false })
      .eq("organizationId", organization.id)
      .order("timestamp", { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (error) throw new AppError("QUERY_FAILED", error.message, 500);

    return successResponse(logs ?? [], 200, {
      page, perPage, totalCount: count ?? 0, totalPages: Math.ceil((count ?? 0) / perPage),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
