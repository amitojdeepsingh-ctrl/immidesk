import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { organization } = await requireAuth();
  const { id: clientId } = await params;
  const body = await req.json();
  const { amount, currency, description, paidAt } = body;

  if (!amount || isNaN(Number(amount))) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("Payment")
    .insert({
      id: crypto.randomUUID(),
      clientId,
      organizationId: organization.id,
      amount: parseFloat(amount),
      currency: currency ?? "CAD",
      description: description ?? null,
      paidAt: paidAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payment: data });
}
