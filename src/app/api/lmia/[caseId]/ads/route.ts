import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { organization } = await requireAuth();
  const { caseId } = await params;
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("LmiaAd")
    .select("*")
    .eq("lmiaCaseId", caseId)
    .eq("organizationId", organization.id)
    .order("startDate", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ads: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { organization } = await requireAuth();
  const { caseId } = await params;
  const body = await req.json();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("LmiaAd")
    .insert({
      lmiaCaseId: caseId,
      organizationId: organization.id,
      platform: body.platform,
      postUrl: body.postUrl ?? null,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ad: data }, { status: 201 });
}
