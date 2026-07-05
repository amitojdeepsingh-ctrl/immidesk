import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyPortalToken } from "@/lib/portal-token";

export async function POST(req: NextRequest) {
  try {
    const { token, caseId, intake } = await req.json();
    if (!token || !caseId || !intake) {
      return NextResponse.json({ error: "token, caseId, intake required" }, { status: 400 });
    }

    const payload = verifyPortalToken(token);
    if (!payload || payload.caseId !== caseId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const db = getSupabaseAdmin();

    // Build update — only set non-empty fields
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    const str = (v: string) => v?.trim() || undefined;
    const date = (v: string) => v ? new Date(v + "T00:00:00Z").toISOString() : undefined;

    if (str(intake.dateOfBirth))     update.dateOfBirth    = date(intake.dateOfBirth);
    if (str(intake.nationality))     update.nationality    = str(intake.nationality);
    if (str(intake.maritalStatus))   update.maritalStatus  = str(intake.maritalStatus);
    if (str(intake.spouseName))      update.spouseName     = str(intake.spouseName);
    if (str(intake.passportNumber))  update.passportNumber = str(intake.passportNumber);
    if (str(intake.passportExpiry))  update.passportExpiry = date(intake.passportExpiry);
    if (str(intake.addressLine1))    update.addressLine1   = str(intake.addressLine1);
    if (str(intake.addressLine2))    update.addressLine2   = str(intake.addressLine2);
    if (str(intake.city))            update.city           = str(intake.city);
    if (str(intake.province))        update.province       = str(intake.province);
    if (str(intake.postalCode))      update.postalCode     = str(intake.postalCode);
    if (str(intake.country))         update.country        = str(intake.country);

    // Store immigration-specific fields in notes JSON blob
    const immigFields = ["currentStatus","previousVisas","languageTest","languageScore","educationLevel","jobTitle","nocCode","yearsOfExperience","additionalNotes"];
    const immigData: Record<string, string> = {};
    for (const f of immigFields) {
      if (str(intake[f])) immigData[f] = intake[f].trim();
    }
    if (Object.keys(immigData).length > 0) {
      update.notes = JSON.stringify(immigData);
    }

    const { error } = await db.from("Client").update(update).eq("id", payload.clientId);
    if (error) throw error;

    // Also update case status to DOCUMENT_COLLECTION
    await db.from("Case").update({ status: "DOCUMENT_COLLECTION", updatedAt: new Date().toISOString() })
      .eq("id", caseId).eq("status", "INTAKE");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("client-portal/intake error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
