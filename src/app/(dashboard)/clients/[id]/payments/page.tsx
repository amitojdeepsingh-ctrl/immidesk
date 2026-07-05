import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { PaymentsView } from "./payments-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientPaymentsPage({ params }: PageProps) {
  const { organization } = await requireAuth();
  const { id: clientId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: client } = await supabase
    .from("Client")
    .select("id, firstName, lastName")
    .eq("id", clientId)
    .eq("organizationId", organization.id)
    .single();

  if (!client) notFound();

  // Gracefully handle the Payment table not existing yet
  let payments: Array<{
    id: string;
    amount: number;
    currency: string;
    description: string | null;
    paidAt: string;
    createdAt: string;
  }> = [];

  let tableReady = true;

  try {
    const { data, error } = await supabase
      .from("Payment")
      .select("id, amount, currency, description, paidAt, createdAt")
      .eq("clientId", clientId)
      .order("paidAt", { ascending: false });

    if (error?.code === "42P01") {
      // Table does not exist yet
      tableReady = false;
    } else {
      payments = (data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        amount: p.amount as number,
        currency: (p.currency as string) ?? "CAD",
        description: p.description as string | null,
        paidAt: typeof p.paidAt === "string" ? p.paidAt : new Date(p.paidAt as Date).toISOString(),
        createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date(p.createdAt as Date).toISOString(),
      }));
    }
  } catch {
    tableReady = false;
  }

  return (
    <PaymentsView
      clientId={clientId}
      organizationId={organization.id}
      payments={payments}
      tableReady={tableReady}
    />
  );
}
