import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { organization } = await requireAuth();
  const { caseId } = await params;
  const body = await req.json();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("LmiaCase")
    .update({
      employerName: body.employerName,
      jobTitle: body.jobTitle,
      nocCode: body.nocCode ?? null,
      location: body.location ?? null,
      status: body.status,
    })
    .eq("id", caseId)
    .eq("organizationId", organization.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ case: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { organization } = await requireAuth();
  const { caseId } = await params;
  const db = getSupabaseAdmin();
  await db.from("LmiaAd").delete().eq("lmiaCaseId", caseId).eq("organizationId", organization.id);
  await db.from("LmiaApplicant").delete().eq("lmiaCaseId", caseId).eq("organizationId", organization.id);
  const { error } = await db.from("LmiaCase").delete().eq("id", caseId).eq("organizationId", organization.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
