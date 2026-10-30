import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAcknowledgementToken } from "@/lib/portal-token";
import {
  acknowledgementStatement,
  type AcknowledgementItem,
} from "@/lib/document-acknowledgement";
import { AcknowledgementView } from "./acknowledgement-view";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AcknowledgementPage({ params }: PageProps) {
  const { token } = await params;
  const payload = verifyAcknowledgementToken(token);

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Link Expired or Invalid</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This link is no longer valid. Please contact your consultant for a new link.
          </p>
        </div>
      </div>
    );
  }

  const db = getSupabaseAdmin();

  const [{ data: ack }, { data: org }] = await Promise.all([
    db
      .from("DocumentAcknowledgement")
      .select(`
        id, title, status, items, itemCount, statementVersion, signedAt, printedName,
        sourceDocumentName,
        client:Client!inner(id, firstName, lastName, email),
        case:Case(id, title, caseType)
      `)
      .eq("id", payload.acknowledgementId)
      .eq("organizationId", payload.organizationId)
      .single(),
    db
      .from("Organization")
      .select("name, email, phone, addressLine1, city, province, postalCode, ciccRegistrationNumber")
      .eq("id", payload.organizationId)
      .single(),
  ]);

  if (!ack) notFound();

  const client = Array.isArray(ack.client) ? ack.client[0] : ack.client;
  const kase = Array.isArray(ack.case) ? ack.case[0] : ack.case;
  if (!client) notFound();

  const items = (Array.isArray(ack.items) ? ack.items : []) as AcknowledgementItem[];
  const clientName = `${client.firstName} ${client.lastName}`;
  const firmName = org?.name ?? "Immigration Services";

  if (ack.status === "PENDING") {
    await db
      .from("DocumentAcknowledgement")
      .update({ viewedAt: new Date().toISOString() })
      .eq("id", ack.id)
      .is("viewedAt", null);
  }

  return (
    <AcknowledgementView
      token={token}
      acknowledgementId={ack.id}
      title={ack.title}
      statementVersion={ack.statementVersion}
      status={ack.status}
      signedAt={ack.signedAt}
      printedName={ack.printedName}
      statement={acknowledgementStatement(firmName)}
      documents={
        ack.sourceDocumentName ? [ack.sourceDocumentName as string] : items.map((i) => i.name)
      }
      documentsUrl={`/api/client-portal/acknowledgement/document?token=${encodeURIComponent(token)}`}
      caseTitle={(kase?.title as string | null) ?? null}
      clientName={clientName}
      clientEmail={client.email}
      org={{
        name: firmName,
        email: (org?.email as string | null) ?? null,
        phone: (org?.phone as string | null) ?? null,
        address: [org?.addressLine1, org?.city, org?.province, org?.postalCode]
          .filter(Boolean)
          .join(", "),
        ciccNumber: (org?.ciccRegistrationNumber as string | null) ?? null,
      }}
    />
  );
}
