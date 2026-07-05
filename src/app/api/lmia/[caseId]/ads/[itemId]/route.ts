import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(_req: Request, { params }: { params: Promise<{ caseId: string; itemId: string }> }) {
  const { organization } = await requireAuth();
  const { caseId, itemId } = await params;
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("LmiaAd")
    .delete()
    .eq("id", itemId)
    .eq("lmiaCaseId", caseId)
    .eq("organizationId", organization.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
