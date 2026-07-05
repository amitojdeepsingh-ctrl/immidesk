import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { organization } = await requireAuth();
  const { caseId } = await params;
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("LmiaApplicant")
    .select("*")
    .eq("lmiaCaseId", caseId)
    .eq("organizationId", organization.id)
    .order("appliedDate", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applicants: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { organization } = await requireAuth();
  const { caseId } = await params;
  const body = await req.json();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("LmiaApplicant")
    .insert({
      lmiaCaseId: caseId,
      organizationId: organization.id,
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      appliedDate: body.appliedDate,
      status: body.status ?? "RECEIVED",
      rejectionReason: body.rejectionReason ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applicant: data }, { status: 201 });
}
