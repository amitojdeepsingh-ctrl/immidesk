import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureInvoiceTable } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

async function setup() {
  await ensureInvoiceTable().catch(e => console.error("ensureInvoiceTable:", e));
}

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    await setup();
    const supabase = getSupabaseAdmin();
    const status = req.nextUrl.searchParams.get("status");

    let query = supabase
      .from("Invoice")
      .select("*")
      .eq("organizationId", organization.id)
      .order("createdAt", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    await setup();
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    // Auto-generate invoice number: INV-YYYY-NNN
    const year = new Date().getFullYear();
    const { data: existing } = await supabase
      .from("Invoice")
      .select("invoiceNumber")
      .eq("organizationId", organization.id)
      .like("invoiceNumber", `INV-${year}-%`)
      .order("invoiceNumber", { ascending: false })
      .limit(1);

    let seq = 1;
    if (existing && existing.length > 0) {
      const last = existing[0].invoiceNumber as string;
      const parts = last.split("-");
      seq = (parseInt(parts[2]) || 0) + 1;
    }
    const invoiceNumber = `INV-${year}-${String(seq).padStart(3, "0")}`;

    // Calculate totals
    const lineItems: { description: string; qty: number; unitPrice: number; amount: number }[] = body.lineItems ?? [];
    const subtotal = lineItems.reduce((s, i) => s + (i.amount ?? i.qty * i.unitPrice), 0);
    const taxRate = parseFloat(body.taxRate ?? "0") || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const row = {
      organizationId: organization.id,
      clientId: body.clientId ?? null,
      invoiceNumber,
      invoiceDate: body.invoiceDate ?? new Date().toISOString(),
      dueDate: body.dueDate ?? null,
      status: "DRAFT",
      billToName: body.billToName,
      billToEmail: body.billToEmail ?? null,
      billToPhone: body.billToPhone ?? null,
      billToAddress: body.billToAddress ?? null,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      currency: body.currency ?? "CAD",
      paymentInstructions: body.paymentInstructions ?? null,
      notes: body.notes ?? null,
    };

    const { data, error } = await supabase.from("Invoice").insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
