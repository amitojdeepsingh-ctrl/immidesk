import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { organization } = await requireAuth();
  const { paymentId } = await params;

  const { error } = await getSupabaseAdmin()
    .from("Payment")
    .delete()
    .eq("id", paymentId)
    .eq("organizationId", organization.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
