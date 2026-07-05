import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organization } = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    // Recalculate totals if lineItems changed
    const updates: Record<string, unknown> = { ...body, updatedAt: new Date().toISOString() };
    if (body.lineItems) {
      const lineItems: { qty: number; unitPrice: number; amount?: number }[] = body.lineItems;
      const subtotal = lineItems.reduce((s, i) => s + (i.amount ?? i.qty * i.unitPrice), 0);
      const taxRate = parseFloat(String(body.taxRate ?? updates.taxRate ?? "0")) || 0;
      const taxAmount = subtotal * (taxRate / 100);
      updates.subtotal = subtotal;
      updates.taxRate = taxRate;
      updates.taxAmount = taxAmount;
      updates.total = subtotal + taxAmount;
    }
    if (body.status === "PAID" && !body.paidAt) updates.paidAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("Invoice")
      .update(updates)
      .eq("id", id)
      .eq("organizationId", organization.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organization } = await requireAuth();
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("Invoice")
      .delete()
      .eq("id", id)
      .eq("organizationId", organization.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
