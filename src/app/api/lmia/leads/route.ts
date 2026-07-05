import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { organization } = await requireAuth();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("LmiaLead")
    .select("*")
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [] });
}

export async function POST(req: Request) {
  const { organization } = await requireAuth();
  const body = await req.json();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("LmiaLead")
    .insert({
      organizationId: organization.id,
      companyName: body.companyName,
      contactName: body.contactName ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      industry: body.industry ?? null,
      province: body.province ?? null,
      jobTitle: body.jobTitle ?? null,
      nocCode: body.nocCode ?? null,
      source: body.source ?? "MANUAL",
      sourceUrl: body.sourceUrl ?? null,
      status: "NEW",
      notes: body.notes ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
