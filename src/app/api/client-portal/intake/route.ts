// ═══════════════════════════════════════════════════════════════════════════
// POST /api/client-portal/intake — Client-facing Personal Information Sheet
// ═══════════════════════════════════════════════════════════════════════════
// Auth: Token-based (no session required).
// Body: { token, caseId, intake: { programType, primary: ApplicantDraft,
//        family: ApplicantDraft[] } }
//
// Persistence:
//   - Updates the Client record (primary applicant identity, non-empty only).
//   - Upserts one IMMFormSubmission per applicant (PRIMARY/SPOUSE/CHILD#n)
//     against an ensured "IMM_PIS" IMMFormTemplate. The full PIS (incl. the
//     18 statutory questions + repeaters) is stored in filledData, with
//     applicant metadata under filledData._meta.
//   - Advances the Case status INTAKE → DOCUMENT_COLLECTION.
// ═══════════════════════════════════════════════════════════════════════════

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyPortalToken } from "@/lib/portal-token";
import { PIS_SECTIONS, type ApplicantDraft } from "@/lib/intake/pis-schema";

const PIS_FORM_CODE = "IMM_PIS";

interface IntakePayload {
  programType?: string;
  primary: ApplicantDraft;
  family?: ApplicantDraft[];
}

function flattenPisFields(): string[] {
  return PIS_SECTIONS.flatMap((s) => s.fields.map((f) => f.key));
}

async function ensurePisTemplate(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data: existing } = await supabase
    .from("IMMFormTemplate")
    .select("id, formCode")
    .eq("formCode", PIS_FORM_CODE)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error: createErr } = await supabase
    .from("IMMFormTemplate")
    .insert({
      id: randomUUID(),
      formCode: PIS_FORM_CODE,
      formName: "Personal Information Sheet",
      version: "1.0",
      irccLastUpdated: new Date().toISOString(),
      fieldSchema: {
        format: "pis-sections",
        fields: flattenPisFields().map((key) => {
          const sec = PIS_SECTIONS.find((s) => s.fields.some((f) => f.key === key));
          const field = sec?.fields.find((f) => f.key === key);
          return field ?? { key, label: key, type: "text", required: false };
        }),
        sections: PIS_SECTIONS,
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createErr || !created) {
    throw new Error(`Failed to ensure IMM_PIS template: ${createErr?.message ?? "no id"}`);
  }
  return created.id;
}

export async function POST(req: NextRequest) {
  try {
    const { token, caseId, intake } = await req.json();

    if (!token || !caseId || !intake?.primary) {
      return NextResponse.json({ error: "token, caseId and intake.primary required" }, { status: 400 });
    }

    const payload = verifyPortalToken(token);
    if (!payload || payload.caseId !== caseId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { programType, primary, family = [] } = intake as IntakePayload;

    // ── Ensure the IMM_PIS template exists (self-healing) ────────────────
    const templateId = await ensurePisTemplate(supabase);

    // ── Update Client with primary identity (non-empty only) ─────────────
    const pis = primary.pis ?? {};
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    const toDate = (v: unknown) => (typeof v === "string" && v ? new Date(v + "T00:00:00Z").toISOString() : undefined);

    if (str(pis.givenNames)) update.firstName = str(pis.givenNames);
    if (str(pis.surname)) update.lastName = str(pis.surname);
    if (str(pis.email)) update.email = str(pis.email);
    if (str(pis.cellPhone)) update.phone = str(pis.cellPhone);
    if (toDate(pis.dateOfBirth)) update.dateOfBirth = toDate(pis.dateOfBirth);
    if (toDate(pis.passportExpiryDate)) update.passportExpiry = toDate(pis.passportExpiryDate);
    if (str(pis.passportNumber)) update.passportNumber = str(pis.passportNumber);
    if (str(pis.birthCountry)) update.nationality = str(pis.birthCountry);
    if (str(pis.countryOfResidence)) update.country = str(pis.countryOfResidence) === "Canada" ? "Canada" : str(pis.countryOfResidence);
    if (str(pis.maritalStatus)) update.maritalStatus = str(pis.maritalStatus);
    if (str(pis.spouseFirstName) || str(pis.spouseLastName)) {
      update.spouseName = `${str(pis.spouseFirstName) ?? ""} ${str(pis.spouseLastName) ?? ""}`.trim();
    }
    if (str(pis.currentAddress)) update.addressLine1 = str(pis.currentAddress);
    if (str(pis.homeCountryAddress)) update.addressLine2 = str(pis.homeCountryAddress);

    if (Object.keys(update).length > 1) {
      const { error: clientErr } = await supabase
        .from("Client")
        .update(update)
        .eq("id", payload.clientId);
      if (clientErr) {
        console.warn("client-portal/intake client update failed:", clientErr.message);
      }
    }

    // ── Upsert one IMMFormSubmission per applicant ───────────────────────
    const applicants: ApplicantDraft[] = [
      { ...primary, applicantLabel: "PRIMARY", role: "PRIMARY", willApply: true },
      ...family.map((f, i) => ({
        ...f,
        applicantLabel: f.role === "SPOUSE" ? "SPOUSE" : `CHILD#${i + 1}`,
      })),
    ];

    const saved: Array<{ applicantLabel: string; willApply: boolean; submissionId: string | null }> = [];

    for (const applicant of applicants) {
      const a = applicant as ApplicantDraft & { role: "PRIMARY" | "SPOUSE" | "CHILD" };
      const label = a.applicantLabel;

      const filledData = {
        ...a.pis,
        education: a.education ?? [],
        employment: a.employment ?? [],
        travel: a.travel ?? [],
        addressHistory: a.addressHistory ?? [],
        statutory: a.statutory ?? {},
        _meta: {
          role: a.role,
          relationLabel: a.relationLabel ?? null,
          willApply: !!a.willApply,
          firstName: a.firstName,
          lastName: a.lastName,
          programType: programType ?? null,
          submittedVia: "client-portal",
        },
      };

      // Unique key: (caseId, templateId, applicantLabel)
      const { data: existingSub } = await supabase
        .from("IMMFormSubmission")
        .select("id")
        .eq("caseId", caseId)
        .eq("templateId", templateId)
        .eq("applicantLabel", label)
        .maybeSingle();

      if (existingSub) {
        await supabase
          .from("IMMFormSubmission")
          .update({
            filledData,
            status: "COMPLETE",
            updatedAt: new Date().toISOString(),
          })
          .eq("id", existingSub.id);
        saved.push({ applicantLabel: label, willApply: !!a.willApply, submissionId: existingSub.id });
      } else {
        const { data: newSub, error: insertErr } = await supabase
          .from("IMMFormSubmission")
          .insert({
            id: randomUUID(),
            caseId,
            templateId,
            applicantLabel: label,
            filledData,
            status: "COMPLETE",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (insertErr) throw new Error(`Failed to save ${label}: ${insertErr.message}`);
        saved.push({ applicantLabel: label, willApply: !!a.willApply, submissionId: newSub?.id ?? null });
      }
    }

    // ── Advance case status ──────────────────────────────────────────────
    await supabase
      .from("Case")
      .update({ status: "DOCUMENT_COLLECTION", updatedAt: new Date().toISOString() })
      .eq("id", caseId)
      .eq("status", "INTAKE");

    return NextResponse.json({ ok: true, applicants: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("client-portal/intake error:", message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";