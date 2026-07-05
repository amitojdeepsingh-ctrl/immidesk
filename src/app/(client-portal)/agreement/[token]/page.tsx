import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAgreementToken } from "@/lib/portal-token";
import { AgreementView } from "./agreement-view";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AgreementPortalPage({ params }: PageProps) {
  const { token } = await params;

  const payload = verifyAgreementToken(token);
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

  const [{ data: agreement }, { data: rcicUser }] = await Promise.all([
    db.from("ServiceAgreement")
      .select(`
        id, title, serviceType, feeAmount, feeCurrency, status, signedAt,
        client:Client!inner(firstName, lastName, email, phone, addressLine1, addressLine2, city, province, postalCode, country),
        organization:Organization!inner(name, ciccRegistrationNumber, addressLine1, addressLine2, city, province, postalCode)
      `)
      .eq("id", payload.agreementId)
      .eq("organizationId", payload.organizationId)
      .single(),
    db.from("User")
      .select("name")
      .eq("organizationId", payload.organizationId)
      .in("role", ["OWNER", "ADMIN"])
      .order("createdAt", { ascending: true })
      .limit(1)
      .single(),
  ]);

  if (!agreement) return notFound();

  const client = Array.isArray(agreement.client) ? agreement.client[0] : agreement.client;
  const org = Array.isArray(agreement.organization) ? agreement.organization[0] : agreement.organization;

  return (
    <AgreementView
      token={token}
      agreementId={agreement.id}
      rcicName={rcicUser?.name ?? org.name}
      rcicNumber={org.ciccRegistrationNumber ?? ""}
      orgName={org.name}
      orgAddress={[org.addressLine1, org.addressLine2, org.city, org.province, org.postalCode].filter(Boolean).join(", ")}
      client={{
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone ?? "",
        address: [client.addressLine1, client.addressLine2, client.city, client.province, client.postalCode, client.country].filter(Boolean).join(", "),
      }}
      serviceType={agreement.serviceType}
      feeAmount={agreement.feeAmount}
      feeCurrency={agreement.feeCurrency}
      alreadySigned={!!agreement.signedAt}
      signedAt={agreement.signedAt ?? null}
    />
  );
}
