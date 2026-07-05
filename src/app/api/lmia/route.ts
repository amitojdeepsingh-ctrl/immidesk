import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { organization } = await requireAuth();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("LmiaCase")
    .select("*")
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cases: data ?? [] });
}

export async function POST(req: Request) {
  const { organization } = await requireAuth();
  const body = await req.json();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("LmiaCase")
    .insert({
      organizationId: organization.id,
      employerName: body.employerName,
      jobTitle: body.jobTitle,
      nocCode: body.nocCode ?? null,
      location: body.location ?? null,
      status: "IN_PROGRESS",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ case: data }, { status: 201 });
}
