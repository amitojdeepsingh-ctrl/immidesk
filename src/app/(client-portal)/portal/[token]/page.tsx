import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyPortalToken } from "@/lib/portal-token";
import { CHECKLISTS, CASE_TYPE_LABELS } from "@/lib/checklists";
import { PortalView } from "./portal-view";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ClientPortalPage({ params }: PageProps) {
  const { token } = await params;

  const payload = verifyPortalToken(token);
  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Link Expired or Invalid</h1>
          <p className="mt-2 text-sm text-zinc-500">This link is no longer valid. Please contact your consultant for a new link.</p>
        </div>
      </div>
    );
  }

  const db = getSupabaseAdmin();
  const [
    { data: caseRecord },
    { data: existingDocs },
    { data: agreement },
    { data: payments },
    { data: messages },
  ] = await Promise.all([
    db.from("Case")
      .select("id, title, caseType, status, clientId, client:Client!inner(id, firstName, lastName, email, phone), organization:Organization!inner(name)")
      .eq("id", payload.caseId)
      .eq("organizationId", payload.organizationId)
      .single(),
    db.from("Document")
      .select("id, name, category, sizeBytes, createdAt")
      .eq("caseId", payload.caseId)
      .order("createdAt", { ascending: false }),
    db.from("ServiceAgreement")
      .select("id, status, signedAt, title")
      .eq("organizationId", payload.organizationId)
      .or(`clientId.eq.${payload.clientId},caseId.eq.${payload.caseId}`)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("Payment")
      .select("id, amount, currency, paymentDate, paymentMethod, receiptNumber, notes")
      .eq("clientId", payload.clientId)
      .eq("organizationId", payload.organizationId)
      .order("paymentDate", { ascending: false }),
    db.from("PortalMessage")
      .select("id, content, sentByClient, senderName, createdAt")
      .eq("caseId", payload.caseId)
      .eq("organizationId", payload.organizationId)
      .order("createdAt", { ascending: true }),
  ]);

  if (!caseRecord) return notFound();

  const client = Array.isArray(caseRecord.client) ? caseRecord.client[0] : caseRecord.client;
  const org = Array.isArray(caseRecord.organization) ? caseRecord.organization[0] : caseRecord.organization;

  const checklist = CHECKLISTS[caseRecord.caseType] ?? CHECKLISTS.OTHER;
  const caseLabel = CASE_TYPE_LABELS[caseRecord.caseType] ?? caseRecord.caseType;

  const serializedDocs = (existingDocs ?? []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    name: d.name as string,
    category: d.category as string,
    sizeBytes: d.sizeBytes as number,
    createdAt: d.createdAt as string,
  }));

  const serializedPayments = (payments ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    amount: p.amount as number,
    currency: p.currency as string,
    paymentDate: p.paymentDate as string,
    paymentMethod: p.paymentMethod as string,
    receiptNumber: p.receiptNumber as string | null,
    notes: p.notes as string | null,
  }));

  const serializedMessages = (messages ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    content: m.content as string,
    sentByClient: m.sentByClient as boolean,
    senderName: m.senderName as string | null,
    createdAt: m.createdAt as string,
  }));

  return (
    <PortalView
      token={token}
      caseId={caseRecord.id}
      caseType={caseRecord.caseType}
      caseLabel={caseLabel}
      caseStatus={caseRecord.status}
      orgName={org.name}
      client={{ id: client.id, firstName: client.firstName, lastName: client.lastName, email: client.email, phone: client.phone }}
      checklist={checklist}
      docsUploaded={serializedDocs.length}
      existingDocs={serializedDocs}
      agreementStatus={agreement?.status ?? null}
      agreementSignedAt={agreement?.signedAt ?? null}
      payments={serializedPayments}
      messages={serializedMessages}
    />
  );
}
