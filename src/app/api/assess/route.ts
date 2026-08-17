import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const programSchema = z.enum(["EXPRESS_ENTRY", "PNP"]);

const querySchema = z.object({
  caseId: z.string().min(1),
  program: programSchema,
});

const DOC_REQUIREMENTS: Record<string, { category: string; label: string; description: string }[]> = {
  EXPRESS_ENTRY: [
    { category: "PASSPORT", label: "Passport", description: "Valid passport for principal applicant and dependants" },
    { category: "EDUCATION", label: "Education (ECA)", description: "Degree/diploma + Educational Credential Assessment" },
    { category: "LANGUAGE_TEST", label: "Language Test", description: "IELTS / CELPIP / TEF results (within 2 years)" },
    { category: "WORK_EXPERIENCE", label: "Work Experience", description: "Reference letters, pay stubs, contracts" },
    { category: "FINANCIAL", label: "Proof of Funds", description: "Bank statements or investment proofs" },
    { category: "MEDICAL", label: "Medical Exam", description: "IME report from panel physician" },
    { category: "POLICE_CERTIFICATE", label: "Police Certificate", description: "From every country lived in 6+ months since age 18" },
    { category: "PHOTO", label: "Passport Photos", description: "Passport-style photos per IRCC specs" },
    { category: "BIRTH_CERTIFICATE", label: "Birth Certificate", description: "Birth certificate for applicant and dependants" },
    { category: "IDENTITY", label: "Identity Document", description: "National ID, driver's license, or government-issued ID" },
  ],
  PNP: [
    { category: "PASSPORT", label: "Passport", description: "Valid passport for principal applicant and dependants" },
    { category: "EDUCATION", label: "Education (ECA)", description: "Degree/diploma + Educational Credential Assessment" },
    { category: "LANGUAGE_TEST", label: "Language Test", description: "IELTS / CELPIP / TEF results (within 2 years)" },
    { category: "WORK_EXPERIENCE", label: "Work Experience", description: "Reference letters, pay stubs, contracts" },
    { category: "FINANCIAL", label: "Proof of Funds / Settlement Funds", description: "Bank statements showing sufficient settlement funds" },
    { category: "MEDICAL", label: "Medical Exam", description: "IME report from panel physician" },
    { category: "POLICE_CERTIFICATE", label: "Police Certificate", description: "From every country lived in 6+ months since age 18" },
    { category: "PHOTO", label: "Passport Photos", description: "Passport-style photos per IRCC specs" },
    { category: "BIRTH_CERTIFICATE", label: "Birth Certificate", description: "Birth certificate for applicant and dependants" },
    { category: "IDENTITY", label: "Identity Document", description: "National ID, driver's license, or government-issued ID" },
    { category: "MARRIAGE_CERTIFICATE", label: "Marriage Certificate", description: "If applicable — for accompanying spouse" },
    { category: "INVITATION", label: "Nomination / Invitation", description: "Provincial nomination certificate or ITA" },
  ],
};

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.parse({
      caseId: searchParams.get("caseId"),
      program: searchParams.get("program"),
    });

    const { caseId, program } = parsed;

    const { data: caseData, error: caseErr } = await getSupabaseAdmin()
      .from("Case")
      .select("id, title, client:Client(id, firstName, lastName)")
      .eq("id", caseId)
      .eq("organizationId", organization.id)
      .single();

    if (caseErr || !caseData) throw new AppError("CASE_NOT_FOUND", "Case not found", 404);
    if (!caseData.client) throw new AppError("NO_CLIENT", "Case has no associated client", 400);

    const { data: documents } = await getSupabaseAdmin()
      .from("Document")
      .select("id, name, category, mimeType, createdAt")
      .eq("caseId", caseId);

    const requirements = DOC_REQUIREMENTS[program] ?? [];
    const uploadedCategories = new Set((documents ?? []).map((d: { category: string }) => d.category));

    const items = requirements.map((req) => ({
      ...req,
      uploaded: uploadedCategories.has(req.category),
    }));

    const uploadedCount = items.filter((i) => i.uploaded).length;
    const totalCount = items.length;
    const allUploaded = uploadedCount === totalCount;

    return successResponse({
      caseId,
      program,
      client: caseData.client,
      caseTitle: caseData.title,
      items,
      summary: {
        uploaded: uploadedCount,
        total: totalCount,
        missing: totalCount - uploadedCount,
        status: allUploaded ? "complete" : "incomplete",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
