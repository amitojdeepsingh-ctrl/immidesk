import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ClientDetailView } from "./client-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { organization } = await requireAuth();
  const { id } = await params;

  const supabase = getSupabaseAdmin();

  const { data: client } = await supabase
    .from("Client")
    .select("*")
    .eq("id", id)
    .eq("organizationId", organization.id)
    .single();

  if (!client) notFound();

  const { count: caseCount } = await supabase
    .from("Case")
    .select("*", { count: "exact", head: true })
    .eq("clientId", id);

  const { count: documentCount } = await supabase
    .from("Document")
    .select("*", { count: "exact", head: true })
    .eq("clientId", id);

  const { data: cases } = await supabase
    .from("Case")
    .select("id, title, caseType, status, priority, createdAt")
    .eq("clientId", id)
    .order("createdAt", { ascending: false })
    .limit(10);

  const serialized = {
    ...client,
    _count: { cases: caseCount ?? 0, documents: documentCount ?? 0 },
    createdAt: typeof client.createdAt === "string" ? client.createdAt : new Date(client.createdAt).toISOString(),
    updatedAt: typeof client.updatedAt === "string" ? client.updatedAt : new Date(client.updatedAt).toISOString(),
    dateOfBirth: client.dateOfBirth ? (typeof client.dateOfBirth === "string" ? client.dateOfBirth : new Date(client.dateOfBirth).toISOString()) : null,
    passportExpiry: client.passportExpiry ? (typeof client.passportExpiry === "string" ? client.passportExpiry : new Date(client.passportExpiry).toISOString()) : null,
    workPermitExpiry: client.workPermitExpiry ? (typeof client.workPermitExpiry === "string" ? client.workPermitExpiry : new Date(client.workPermitExpiry).toISOString()) : null,
    cases: (cases ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date(c.createdAt as Date).toISOString(),
    })),
  };

  return <ClientDetailView client={serialized} />;
}
