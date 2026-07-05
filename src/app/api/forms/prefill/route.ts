// ---------------------------------------------------------------------------
// POST /api/forms/prefill — Pre-fill an IRCC form with client data via AI
// ---------------------------------------------------------------------------
// Auth: Session required. Scoped to user's organization.
// Loads the IMMFormTemplate field schema + client data, then runs AI
// form-filler to map client data to form fields.
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  handleApiError,
  AppError,
} from "@/lib/api/errors";
import {
  prefillForm,
  type FormField,
} from "@/lib/ai/form-filler";
import { z } from "zod";

// --- Validation -------------------------------------------------------------

const prefillSchema = z.object({
  templateId: z.string().min(1, "templateId is required"),
  clientId: z.string().min(1, "clientId is required"),
});

// --- POST — Pre-fill Form --------------------------------------------------

/**
 * POST /api/forms/prefill
 *
 * Body (JSON):
 * { templateId: string, clientId: string }
 *
 * Returns: { data: { success: true, prefilledData: Record<string, any> }, meta: null, error: null }
 */
export async function POST(req: NextRequest) {
  try {
    const { organization } = await requireAuth();

    const body = await req.json();
    const { templateId, clientId } = prefillSchema.parse(body);

    const supabase = getSupabaseAdmin();

    // Load form template — verify it belongs to no org (global templates) or is accessible
    const { data: template, error: templateError } = await supabase
      .from("IMMFormTemplate")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template || !template.isActive) {
      throw new AppError(
        "TEMPLATE_NOT_FOUND",
        "Form template not found or is inactive",
        404,
      );
    }

    // Load client — scoped to organization
    const { data: client, error: clientError } = await supabase
      .from("Client")
      .select("*")
      .eq("id", clientId)
      .eq("organizationId", organization.id)
      .single();

    if (clientError || !client) {
      throw new AppError(
        "CLIENT_NOT_FOUND",
        "Client not found or does not belong to your organization",
        404,
      );
    }

    // ponytail: Prisma 7 returns Json, cast through unknown
    const rawSchema = template.fieldSchema as unknown;
    const fieldSchema = rawSchema as { fields: FormField[] } | FormField[];
    const fields: FormField[] = Array.isArray(fieldSchema)
      ? (fieldSchema as unknown as FormField[])
      : ((fieldSchema as { fields?: FormField[] })?.fields ?? []);

    if (fields.length === 0) {
      throw new AppError(
        "INVALID_SCHEMA",
        "Form template has no fields configured",
        400,
      );
    }

    // Build client data dictionary from all available fields
    const clientData: Record<string, string | number | boolean | null | undefined> = {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      dateOfBirth: client.dateOfBirth ?? null,
      nationality: client.nationality,
      passportNumber: client.passportNumber,
      passportExpiry: client.passportExpiry ?? null,
      maritalStatus: client.maritalStatus,
      spouseName: client.spouseName,
      addressLine1: client.addressLine1,
      addressLine2: client.addressLine2,
      city: client.city,
      province: client.province,
      postalCode: client.postalCode,
      country: client.country,
    };

    const prefilledData = await prefillForm(fields, clientData);

    return successResponse({ success: true, prefilledData });
  } catch (err) {
    return handleApiError(err);
  }
}
