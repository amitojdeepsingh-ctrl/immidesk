// ---------------------------------------------------------------------------
// POST /api/agreements/generate Ã¢â‚¬â€ Generate a service agreement PDF
// ---------------------------------------------------------------------------
// Auth: Session required. Scoped to user''s organization.
// Generates a PDF service agreement, stores it, and returns the agreement
// record with a download URL.
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
  AppError,
} from "@/lib/api/errors";
import { agreementGenerateSchema } from "@/lib/api/validations";
import { generateAgreementPdf } from "@/lib/pdf/generator";
import type { AgreementTemplateData } from "@/lib/pdf/agreement-template";
import { nanoid } from "nanoid";

// --- POST Ã¢â‚¬â€ Generate Agreement --------------------------------------------

/**
 * POST /api/agreements/generate
 *
 * Body (JSON):
 * {
 *   clientId: string (required),
 *   caseId?: string | null,
 *   title: string (required),
 *   description?: string | null,
 *   serviceType: "consultation" | "representation" | "document_review" | "form_filing" | "full_service" | "other",
 *   feeAmount: number,
 *   feeCurrency: string (3-letter, default "CAD"),
 *   feeStructure: "flat" | "hourly" | "milestone" | "retainer",
 *   paymentSchedule: "upfront" | "monthly" | "on_completion" | "milestone" | "split",
 *   startDate?: string (ISO 8601) | null,
 *   endDate?: string (ISO 8601) | null,
 *   terms: {
 *     scopeOfWork: string,
 *     feesAndPayment: string,
 *     clientResponsibilities: string,
 *     confidentiality: string,
 *     termination: string,
 *     governingLaw: string,
 *     additionalClauses?: string[]
 *   }
 * }
 *
 * Returns: { data: { agreement, downloadUrl }, meta: null, error: null }
 */
export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const body = await req.json();
    // Convert YYYY-MM-DD to full ISO datetime
    for (const field of ["startDate", "endDate"] as const) {
      if (body[field] && /^\d{4}-\d{2}-\d{2}$/.test(body[field])) {
        body[field] = `${body[field]}T00:00:00.000Z`;
      }
    }
    const validated = agreementGenerateSchema.parse(body);

    // Verify client belongs to this organization
    const { data: client, error: clientError } = await supabase
      .from("Client")
      .select("*")
      .eq("id", validated.clientId)
      .eq("organizationId", organization.id)
      .single();

    if (clientError || !client) {
      throw new AppError(
        "CLIENT_NOT_FOUND",
        "Client not found or does not belong to your organization",
        404,
      );
    }

    // Verify case if provided
    if (validated.caseId) {
      const { data: caseRecord, error: caseError } = await supabase
        .from("Case")
        .select("id")
        .eq("id", validated.caseId)
        .eq("organizationId", organization.id)
        .single();
      if (!caseRecord) {
        throw new AppError(
          "CASE_NOT_FOUND",
          "Case not found or does not belong to your organization",
          404,
        );
      }
    }

    // Generate agreement number
    const agreementNumber = `SA-${nanoid(8).toUpperCase()}`;
    const generatedAt = new Date().toISOString();

    // Build template data
    const templateData: AgreementTemplateData = {
      firm: {
        name: organization.name,
        address: [
          organization.addressLine1,
          organization.addressLine2,
          organization.city,
          organization.province,
          organization.postalCode,
          organization.country,
        ]
          .filter(Boolean)
          .join(", ") || undefined,
        ciccNumber: organization.ciccRegistrationNumber ?? undefined,
        phone: organization.phone ?? undefined,
        email: prismaUser.email,
      },
      client: {
        fullName: `${client.firstName} ${client.lastName}`,
        email: client.email,
        phone: client.phone ?? undefined,
        address: [
          client.addressLine1,
          client.addressLine2,
          client.city,
          client.province,
          client.postalCode,
          client.country,
        ]
          .filter(Boolean)
          .join(", ") || undefined,
        nationality: client.nationality ?? undefined,
      },
      agreement: {
        title: validated.title,
        description: validated.description ?? undefined,
        serviceType: validated.serviceType,
        feeAmount: validated.feeAmount,
        feeCurrency: validated.feeCurrency,
        feeStructure: validated.feeStructure,
        paymentSchedule: validated.paymentSchedule,
        startDate: validated.startDate ?? undefined,
        endDate: validated.endDate ?? undefined,
        caseId: validated.caseId ?? undefined,
        signatureDataUrl: validated.signatureDataUrl ?? undefined,
        terms: validated.terms,
      },
      meta: {
        agreementNumber,
        generatedAt,
        version: "1.0.0",
      },
    };

    // Generate PDF
    const pdfBuffer = await generateAgreementPdf(templateData);

    // Store PDF path (in production, upload to Supabase Storage)
    const pdfStoragePath = `agreements/${organization.id}/${agreementNumber}.pdf`;

    // Create agreement record in database
    const { data: agreement, error: agreementError } = await supabase
      .from("ServiceAgreement")
      .insert({
        organizationId: organization.id,
        clientId: validated.clientId,
        caseId: validated.caseId ?? null,
        title: validated.title,
        description: validated.description ?? null,
        status: "DRAFT",
        serviceType: validated.serviceType,
        feeAmount: validated.feeAmount,
        feeCurrency: validated.feeCurrency,
        feeStructure: validated.feeStructure,
        paymentSchedule: validated.paymentSchedule,
        startDate: validated.startDate ? new Date(validated.startDate).toISOString() : null,
        endDate: validated.endDate ? new Date(validated.endDate).toISOString() : null,
        terms: validated.terms,
        pdfStoragePath,
      })
      .select()
      .single();

    if (agreementError || !agreement) {
      throw new AppError(
        "AGREEMENT_CREATION_FAILED",
        "Failed to create agreement record",
        500,
      );
    }

    // Log activity
    const { error: logError } = await supabase.from("ActivityLog").insert({
      organizationId: organization.id,
      userId: prismaUser.id,
      action: "AGREEMENT_GENERATED",
      entityType: "ServiceAgreement",
      entityId: agreement.id,
      metadata: {
        agreementNumber,
        clientName: `${client.firstName} ${client.lastName}`,
        title: validated.title,
      },
    });

    // Return the PDF as base64 in the response (for immediate download)
    const pdfBase64 = pdfBuffer.toString("base64");

    return successResponse(
      {
        agreement: {
          id: agreement.id,
          title: agreement.title,
          status: agreement.status,
          agreementNumber,
          pdfStoragePath,
          createdAt: agreement.createdAt,
        },
        pdfBase64,
        fileName: `${agreementNumber}-${validated.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.pdf`,
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}