import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";
import { generateSOP, type ClientSOPData, type CaseSOPData } from "@/lib/ai/sop-generator";
import { z } from "zod";

const docTypeEnum = z.enum(["SOP", "ICCRC_COMMUNICATION"]);

const generateSchema = z.object({
  caseId: z.string().min(1),
  docType: docTypeEnum,
  notes: z.string().optional().default(""),
});

function buildIccrcPrompt(client: ClientSOPData, caseData: CaseSOPData, notes: string): string {
  return `You are an experienced Canadian immigration consultant writing a formal communication to the College of Immigration and Citizenship Consultants (CICCC/ICCRC).

Write a professional, formal letter addressed to ICCRC/CICCC regarding a client's case. Use a formal tone suitable for regulatory correspondence.

## Applicant Profile
- Full Name: ${client.firstName} ${client.lastName}
- Nationality: ${client.nationality ?? "Not specified"}
- Age: ${client.age ?? "Not specified"}
- Education: ${client.education ?? "Not specified"}
- Work Experience: ${client.workExperience ?? "Not specified"}
- Language Test Scores: ${client.languageScores ?? "Not specified"}
- Marital Status: ${client.maritalStatus ?? "Not specified"}

## Case Details
- Immigration Program: ${caseData.caseType}
- Visa Office: ${caseData.visaOffice ?? "Not specified"}
- Additional Context: ${caseData.additionalNotes ?? "Not specified"}
- Consultant Notes: ${notes || "None specified"}

## Guidelines
1. Address the letter to the Registrar, CICCC/ICCRC.
2. Include the consultant's RCIC/CRIC registration number (placeholder: [RCIC NUMBER]).
3. Clearly state the purpose of the communication (e.g., submission of application, response to procedural fairness letter, request for status update, change of representation).
4. Reference the client's full name, date of birth, and UCI or application number if available.
5. Maintain a respectful, professional, and factual tone throughout.
6. Keep the letter concise — 300-500 words.
7. Close with the consultant's name and signature block.

Write the full letter now. Output only the letter text — no meta-commentary.`;
}

export async function POST(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const body = await req.json();
    const parsed = generateSchema.parse(body);

    const { data: caseRecord, error: caseError } = await supabase
      .from("Case")
      .select("*, client:Client!inner(*)")
      .eq("id", parsed.caseId)
      .eq("organizationId", organization.id)
      .single();

    if (caseError || !caseRecord) {
      throw new AppError("CASE_NOT_FOUND", "Case not found", 404);
    }

    const client = caseRecord.client;

    let age: number | null = null;
    if (client.dateOfBirth) {
      const today = new Date();
      const dob = new Date(client.dateOfBirth);
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
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
      additionalNotes: parsed.notes || caseRecord.notes,
    };

    let content: string;
    let docLabel: string;

    if (parsed.docType === "SOP") {
      content = await generateSOP(clientData, caseData);
      docLabel = "SOP_GENERATED";
    } else {
      content = buildIccrcPrompt(clientData, caseData, parsed.notes);
      docLabel = "ICCRC_COMMUNICATION_GENERATED";
    }

    await supabase.from("ActivityLog").insert({
      organizationId: organization.id,
      userId: (await requireAuth()).prismaUser.id,
      action: docLabel,
      entityType: "Case",
      entityId: caseRecord.id,
      metadata: { clientName: `${client.firstName} ${client.lastName}`, caseType: caseRecord.caseType },
    });

    return successResponse({ success: true, content, docType: parsed.docType });
  } catch (err) {
    return handleApiError(err);
  }
}
