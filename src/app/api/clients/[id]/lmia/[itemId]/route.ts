import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { organization } = await requireAuth();
    const { id: clientId, itemId } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "ad";
    const db = getSupabaseAdmin();

    const table = type === "applicant" ? "LmiaApplicant" : "LmiaAd";
    const { error } = await db.from(table)
      .delete()
      .eq("id", itemId)
      .eq("clientId", clientId)
      .eq("organizationId", organization.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
