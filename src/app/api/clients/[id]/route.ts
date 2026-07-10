import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
  AppError,
} from "@/lib/api/errors";
import { clientUpdateSchema } from "@/lib/api/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { organization } = await requireAuth();
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: client, error } = await supabase
      .from("Client")
      .select("*, cases:Case(id, title, caseType, status, priority, createdAt)")
      .eq("id", id)
      .eq("organizationId", organization.id)
      .single();

    if (error || !client) {
      return errorResponse("NOT_FOUND", "Client not found", null, 404);
    }

    const { count: casesCount } = await supabase
      .from("Case")
      .select("*", { count: "exact", head: true })
      .eq("clientId", id);

    const { count: docsCount } = await supabase
      .from("Document")
      .select("*", { count: "exact", head: true })
      .eq("clientId", id);

    return successResponse({ ...client, _count: { cases: casesCount ?? 0, documents: docsCount ?? 0 } }, 200);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("Client")
      .select("*")
      .eq("id", id)
      .eq("organizationId", organization.id)
      .single();

    if (!existing) {
      return errorResponse("NOT_FOUND", "Client not found", null, 404);
    }

    const body = await req.json();
    // Convert YYYY-MM-DD (from <input type="date">) to full ISO datetime
    for (const field of ["dateOfBirth", "passportExpiry", "workPermitExpiry"] as const) {
      if (body[field] && /^\d{4}-\d{2}-\d{2}$/.test(body[field])) {
        body[field] = `${body[field]}T00:00:00.000Z`;
      }
    }
    const validated = clientUpdateSchema.parse(body);

    if (validated.email && validated.email !== existing.email) {
      const { data: duplicate } = await supabase
        .from("Client")
        .select("id")
        .eq("organizationId", organization.id)
        .eq("email", validated.email)
        .maybeSingle();
      if (duplicate) {
        return errorResponse("DUPLICATE_EMAIL", `A client with email ${validated.email} already exists in your organization`, null, 409);
      }
    }

    const data: Record<string, unknown> = { ...validated };
    if (validated.dateOfBirth !== undefined) {
      data.dateOfBirth = validated.dateOfBirth ? new Date(validated.dateOfBirth).toISOString() : null;
    }
    if (validated.passportExpiry !== undefined) {
      data.passportExpiry = validated.passportExpiry ? new Date(validated.passportExpiry).toISOString() : null;
    }

    const { data: client, error: updateError } = await supabase
      .from("Client")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new AppError("UPDATE_FAILED", updateError.message, 500);

    const { error: logError } = await supabase
      .from("ActivityLog")
      .insert({
        organizationId: organization.id,
        userId: prismaUser.id,
        action: "CLIENT_UPDATED",
        entityType: "Client",
        entityId: id,
        metadata: { clientName: `${client.firstName} ${client.lastName}`, updatedFields: Object.keys(validated).filter((k) => validated[k as keyof typeof validated] !== undefined) },
      });

    if (logError) console.warn("ActivityLog insert failed:", logError.message);

    return successResponse(client, 200);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("Client")
      .select("id, firstName, lastName, email")
      .eq("id", id)
      .eq("organizationId", organization.id)
      .single();

    if (!existing) {
      return errorResponse("NOT_FOUND", "Client not found", null, 404);
    }

    // Cascade delete: remove associated cases first
    await supabase.from("Case").delete().eq("clientId", id);

    const { error: deleteError } = await supabase.from("Client").delete().eq("id", id);
    if (deleteError) throw new AppError("DELETE_FAILED", deleteError.message, 500);

    const { error: logError } = await supabase
      .from("ActivityLog")
      .insert({
        organizationId: organization.id,
        userId: prismaUser.id,
        action: "CLIENT_DELETED",
        entityType: "Client",
        entityId: id,
        metadata: { clientName: `${existing.firstName} ${existing.lastName}`, clientEmail: existing.email },
      });

    if (logError) console.warn("ActivityLog insert failed:", logError.message);

    return successResponse({ deleted: true }, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
