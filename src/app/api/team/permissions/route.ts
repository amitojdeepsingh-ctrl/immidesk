import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const roleEnum = z.enum(["OWNER", "ADMIN", "CONSULTANT", "ASSISTANT", "AUDITOR"]);
const permissionEnum = z.enum([
  "CASES_VIEW", "CASES_CREATE", "CASES_EDIT", "CASES_DELETE",
  "CLIENTS_VIEW", "CLIENTS_CREATE", "CLIENTS_EDIT", "CLIENTS_DELETE",
  "DOCUMENTS_VIEW", "DOCUMENTS_UPLOAD", "DOCUMENTS_DELETE",
  "TASKS_VIEW", "TASKS_CREATE", "TASKS_EDIT", "TASKS_DELETE",
  "INVOICES_VIEW", "INVOICES_CREATE", "INVOICES_EDIT", "INVOICES_DELETE",
  "CONSULTATIONS_VIEW", "CONSULTATIONS_CREATE", "CONSULTATIONS_EDIT",
  "REPORTS_VIEW", "REPORTS_EXPORT",
  "SETTINGS_VIEW", "SETTINGS_EDIT",
  "TEAM_VIEW", "TEAM_MANAGE",
  "BILLING_VIEW", "BILLING_MANAGE",
]);

const bulkSetSchema = z.object({
  permissions: z.array(z.object({
    role: roleEnum,
    permission: permissionEnum,
  })),
});

export async function GET() {
  try {
    const { organization } = await requireAuth();
    const { data: permissions, error } = await getSupabaseAdmin()
      .from("RolePermission")
      .select("*")
      .eq("organizationId", organization.id)
      .order("role", { ascending: true });

    if (error) throw new AppError("QUERY_FAILED", error.message, 500);
    return successResponse(permissions ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const parsed = bulkSetSchema.parse(body);

    const values = parsed.permissions.map((p) => ({
      organizationId: organization.id,
      role: p.role,
      permission: p.permission,
    }));

    const { error: delErr } = await supabase
      .from("RolePermission")
      .delete()
      .eq("organizationId", organization.id);
    if (delErr) throw new AppError("DELETE_FAILED", delErr.message, 500);

    if (values.length > 0) {
      const { error: insErr } = await supabase
        .from("RolePermission")
        .insert(values);
      if (insErr) throw new AppError("INSERT_FAILED", insErr.message, 500);
    }

    const { data: permissions, error: fetchErr } = await supabase
      .from("RolePermission")
      .select("*")
      .eq("organizationId", organization.id)
      .order("role", { ascending: true });

    if (fetchErr) throw new AppError("QUERY_FAILED", fetchErr.message, 500);
    return successResponse(permissions ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}
