// ---------------------------------------------------------------------------
// POST /api/sop/generate — Generate an AI-powered SOP letter for a case
// ---------------------------------------------------------------------------
// Auth: Session required. Scoped to user's organization.
// Loads client + case from DB, generates SOP via Claude, returns the text.
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
  generateSOP,
  type ClientSOPData,
  type CaseSOPData,
} from "@/lib/ai/sop-generator";
import { z } from "zod";

// --- Validation -------------------------------------------------------------

const generateSchema = z.object({
  caseId: z.string().min(1, "caseId is required"),
});

// --- POST — Generate SOP ---------------------------------------------------

/**
 * POST /api/sop/generate
 *
 * Body (JSON):
 * { caseId: string }
 *
 * Returns: { data: { success: true, sop: string }, meta: null, error: null }
 */
export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();

    const body = await req.json();
    const { caseId } = generateSchema.parse(body);

    const supabase = getSupabaseAdmin();

    // Load case with client, scoped to organization
    const { data: caseRecord, error: caseError } = await supabase
      .from("Case")
      .select("*, client:Client!inner(*)")
      .eq("id", caseId)
      .eq("organizationId", organization.id)
      .single();

    if (caseError || !caseRecord) {
      throw new AppError(
        "CASE_NOT_FOUND",
        "Case not found or does not belong to your organization",
        404,
      );
    }

    const client = caseRecord.client;

    // Compute age from dateOfBirth
    let age: number | null = null;
    if (client.dateOfBirth) {
      const today = new Date();
      const dob = new Date(client.dateOfBirth);
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
    }

    const clientData: ClientSOPData = {
      firstName: client.firstName,
      lastName: client.lastName,
      nationality: client.nationality,
      age,
      education: caseRecord.description ?? null,
      workExperience: null,
      languageScores: null,
      maritalStatus: client.maritalStatus,
    };

    const caseData: CaseSOPData = {
      caseType: caseRecord.caseType,
      visaOffice: null,
      additionalNotes: caseRecord.notes,
    };

    const sop = await generateSOP(clientData, caseData);

    // Log activity
    const { error: logError } = await supabase.from("ActivityLog").insert({
      organizationId: organization.id,
      userId: prismaUser.id,
      action: "SOP_GENERATED",
      entityType: "Case",
      entityId: caseRecord.id,
      metadata: {
        clientName: `${client.firstName} ${client.lastName}`,
        caseType: caseRecord.caseType,
      },
    });

    if (logError) {
      console.error("Failed to log activity:", logError);
    }

    return successResponse({ success: true, sop });
  } catch (err) {
    return handleApiError(err);
  }
}
