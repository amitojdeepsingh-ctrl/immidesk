// ============================================================================
// AI SOP Generator — Anthropic-powered Standard Operating Procedure letter
// ============================================================================
// Generates personalized SOP (Statement of Purpose) letters for Canadian
// immigration applications (Study Permit, Express Entry, PNP, etc.).
// Uses @anthropic-ai/sdk with Claude to produce professional, IRCC-ready text.
// ============================================================================

import Anthropic from "@anthropic-ai/sdk";

// --- Types -----------------------------------------------------------------

export interface ClientSOPData {
  firstName: string;
  lastName: string;
  nationality?: string | null;
  age?: number | null;
  education?: string | null;
  workExperience?: string | null;
  languageScores?: string | null;
  maritalStatus?: string | null;
}

export interface CaseSOPData {
  caseType: string;
  visaOffice?: string | null;
  additionalNotes?: string | null;
}

// --- Singleton Anthropic client (lazy init) ---------------------------------

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

function getAnthropicClient(): Anthropic {
  if (!globalForAnthropic.anthropic) {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    globalForAnthropic.anthropic = new Anthropic({ apiKey });
  }
  return globalForAnthropic.anthropic;
}

// --- Prompt Builder ---------------------------------------------------------

function buildPrompt(client: ClientSOPData, caseData: CaseSOPData): string {
  const fullName = `${client.firstName} ${client.lastName}`;

  return `You are an experienced Canadian immigration consultant writing a professional Statement of Purpose (SOP) letter for IRCC (Immigration, Refugees and Citizenship Canada).

Write a compelling, personalized SOP for the following applicant. The letter must be formal, persuasive, and tailored to the specific immigration program. Use a professional tone suitable for an IRCC officer.

## Applicant Profile
- Full Name: ${fullName}
- Nationality: ${client.nationality ?? "Not specified"}
- Age: ${client.age ?? "Not specified"}
- Education: ${client.education ?? "Not specified"}
- Work Experience: ${client.workExperience ?? "Not specified"}
- Language Test Scores: ${client.languageScores ?? "Not specified"}
- Marital Status: ${client.maritalStatus ?? "Not specified"}

## Application Details
- Immigration Program: ${caseData.caseType}
- Visa Office: ${caseData.visaOffice ?? "Not specified"}
- Additional Context: ${caseData.additionalNotes ?? "Not specified"}

## Guidelines
1. Address the letter to the visa officer at the specified visa office.
2. Open with a clear statement of the purpose of the application.
3. For study permits: explain why the applicant chose Canada, their program of study, how it fits their career goals, and ties to home country.
4. For economic programs (Express Entry, PNP): highlight skills, experience, education, language proficiency, and how the applicant will contribute to Canada's economy.
5. For family sponsorship: emphasize family ties and reunification goals.
6. Be specific about the applicant's background — avoid generic filler.
7. Keep the letter between 500-800 words, well-structured with paragraphs.
8. Close with a professional sign-off expressing gratitude for the officer's time.

Write the full SOP letter now. Do not include any meta-commentary or notes — output only the letter text.`;
}

// --- Generator --------------------------------------------------------------

/**
 * Generate a personalized SOP letter using Claude AI.
 *
 * @param clientData - The client's personal and professional profile
 * @param caseData   - The case type and application details
 * @returns The full SOP letter text
 */
export async function generateSOP(
  clientData: ClientSOPData,
  caseData: CaseSOPData,
): Promise<string> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature: 0.7,
    system: "You are an experienced Canadian immigration consultant. Generate professional, compelling Statement of Purpose (SOP) letters for IRCC applications. Output only the letter text — no commentary.",
    messages: [
      {
        role: "user",
        content: buildPrompt(clientData, caseData),
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}
