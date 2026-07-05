import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { organization } = await requireAuth();
  const { leadId } = await params;
  const body = await req.json();
  const db = getSupabaseAdmin();

  const allowed = [
    "companyName","contactName","email","phone","industry",
    "province","jobTitle","nocCode","source","sourceUrl","status","notes","emailSentAt",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { data, error } = await db
    .from("LmiaLead")
    .update(update)
    .eq("id", leadId)
    .eq("organizationId", organization.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { organization } = await requireAuth();
  const { leadId } = await params;
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("LmiaLead")
    .delete()
    .eq("id", leadId)
    .eq("organizationId", organization.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
