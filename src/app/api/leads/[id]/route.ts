import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/leads/[id] — update status (contacted | skipped)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organization } = await requireAuth();
    const { id } = await params;
    const { status } = await req.json();
    const supabase = getSupabaseAdmin();

    const update: Record<string, unknown> = { status };
    if (status === "contacted") update.contactedAt = new Date().toISOString();

    const { error } = await supabase
      .from("Lead")
      .update(update)
      .eq("id", id)
      .eq("organizationId", organization.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
