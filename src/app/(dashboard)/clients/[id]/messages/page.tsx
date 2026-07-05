import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { MessagesView } from "./messages-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MessagesPage({ params }: PageProps) {
  const { organization, prismaUser } = await requireAuth();
  const { id: clientId } = await params;
  const db = getSupabaseAdmin();

  const { data: client } = await db
    .from("Client")
    .select("id, firstName, lastName, email")
    .eq("id", clientId)
    .eq("organizationId", organization.id)
    .single();

  if (!client) notFound();

  // Get the latest case for this client (for caseId)
  const { data: latestCase } = await db
    .from("Case")
    .select("id, title, caseType")
    .eq("clientId", clientId)
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: messages } = await db
    .from("PortalMessage")
    .select("*")
    .eq("clientId", clientId)
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: true });

  return (
    <MessagesView
      clientId={clientId}
      clientName={`${client.firstName} ${client.lastName}`}
      rcicName={prismaUser.name}
      caseId={latestCase?.id ?? null}
      caseTitle={latestCase?.title ?? null}
      initialMessages={messages ?? []}
    />
  );
}
