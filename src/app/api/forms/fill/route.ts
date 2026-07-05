// ---------------------------------------------------------------------------
// POST /api/forms/fill — Fill an IMM form and return the filled PDF
// ---------------------------------------------------------------------------
// Auth: Session required. Scoped to user's organization.
// Body: { templateId: string, clientId: string, caseId: string }
// Returns: { data: { filledFields, unfilledFields, warnings, pdf (base64) } }
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";
import { prefillForm, type FormField } from "@/lib/ai/form-filler";
import { z } from "zod";

const fillSchema = z.object({
  templateId: z.string().min(1),
  clientId: z.string().min(1),
  caseId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const body = await req.json();
    const { templateId, clientId, caseId } = fillSchema.parse(body);

    const supabase = getSupabaseAdmin();

    // Load template
    const { data: template, error: tmplErr } = await supabase
      .from("IMMFormTemplate")
      .select("*")
      .eq("id", templateId)
      .eq("isActive", true)
      .single();

    if (tmplErr || !template) {
      throw new AppError("TEMPLATE_NOT_FOUND", "Form template not found", 404);
    }

    // Load client (scoped to org)
    const { data: client, error: clientErr } = await supabase
      .from("Client")
      .select("*")
      .eq("id", clientId)
      .eq("organizationId", organization.id)
      .single();

    if (clientErr || !client) {
      throw new AppError("CLIENT_NOT_FOUND", "Client not found", 404);
    }

    // Load case (scoped to org)
    const { data: caseRecord, error: caseErr } = await supabase
      .from("Case")
      .select("*")
      .eq("id", caseId)
      .eq("organizationId", organization.id)
      .single();

    if (caseErr || !caseRecord) {
      throw new AppError("CASE_NOT_FOUND", "Case not found", 404);
    }

    // Parse field schema from template
    const rawSchema = template.fieldSchema as unknown;
    const fieldSchema = rawSchema as { fields: FormField[] } | FormField[];
    const fields: FormField[] = Array.isArray(fieldSchema)
      ? (fieldSchema as unknown as FormField[])
      : ((fieldSchema as { fields?: FormField[] })?.fields ?? []);

    if (fields.length === 0) {
      throw new AppError("INVALID_SCHEMA", "Form template has no fields configured", 400);
    }

    // Build client data dict
    const clientData: Record<string, string | number | boolean | null | undefined> = {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      dateOfBirth: client.dateOfBirth,
      nationality: client.nationality,
      passportNumber: client.passportNumber,
      passportExpiry: client.passportExpiry,
      maritalStatus: client.maritalStatus,
      spouseName: client.spouseName,
      addressLine1: client.addressLine1,
      addressLine2: client.addressLine2,
      city: client.city,
      province: client.province,
      postalCode: client.postalCode,
      country: client.country,
      caseType: caseRecord.caseType,
      irccApplicationNumber: caseRecord.irccApplicationNumber,
      uciNumber: caseRecord.uciNumber,
    };

    // Run AI prefill
    const prefilledData = await prefillForm(fields, clientData);

    const filledFields = Object.entries(prefilledData)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k]) => k);

    const unfilledFields = fields
      .filter((f) => {
        const v = prefilledData[f.key];
        return v === null || v === undefined || v === "";
      })
      .map((f) => f.key);

    // Upsert submission
    const { data: existingSub } = await supabase
      .from("IMMFormSubmission")
      .select("id")
      .eq("caseId", caseId)
      .eq("templateId", templateId)
      .maybeSingle();

    let submissionId: string;

    if (existingSub) {
      await supabase
        .from("IMMFormSubmission")
        .update({ filledData: prefilledData, status: "DRAFT", updatedAt: new Date().toISOString() })
        .eq("id", existingSub.id);
      submissionId = existingSub.id;
    } else {
      const { data: newSub } = await supabase
        .from("IMMFormSubmission")
        .insert({
          caseId,
          templateId,
          filledData: prefilledData,
          status: "DRAFT",
        })
        .select("id")
        .single();
      submissionId = newSub?.id ?? "";
    }

    return successResponse({
      submissionId,
      filledFields,
      unfilledFields,
      totalFields: fields.length,
      prefilledData,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
