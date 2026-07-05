import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { AgreementForm } from "@/components/agreements/AgreementForm";
import { DownloadAgreementButton } from "@/components/agreements/DownloadAgreementButton";
import { CheckCircle2, PenLine, Clock } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ caseId?: string }>;
}

export default async function ClientAgreementPage({ params, searchParams }: PageProps) {
  const { organization } = await requireAuth();
  const { id: clientId } = await params;
  const { caseId } = await searchParams;
  const supabase = getSupabaseAdmin();

  const { data: client } = await supabase
    .from("Client")
    .select("id, firstName, lastName")
    .eq("id", clientId)
    .eq("organizationId", organization.id)
    .single();

  if (!client) notFound();

  const [{ data: cases }, { data: latestAgreement }] = await Promise.all([
    supabase
      .from("Case")
      .select("id, title, caseType")
      .eq("clientId", clientId)
      .eq("organizationId", organization.id)
      .neq("status", "CLOSED")
      .order("createdAt", { ascending: false }),
    supabase
      .from("ServiceAgreement")
      .select("id, status, signedAt, title, serviceType, feeAmount, feeCurrency")
      .eq("clientId", clientId)
      .eq("organizationId", organization.id)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const clientName = `${client.firstName} ${client.lastName}`;

  return (
    <div className="space-y-6">
      {/* Agreement status banner */}
      {latestAgreement && (
        <div className={
          latestAgreement.status === "SIGNED"
            ? "flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/20"
            : latestAgreement.status === "SENT"
            ? "flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
            : "flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
        }>
          {latestAgreement.status === "SIGNED" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
          ) : latestAgreement.status === "SENT" ? (
            <PenLine className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
          )}
          <div className="flex flex-1 flex-wrap items-start justify-between gap-4">
            <div>
              <p className={
                latestAgreement.status === "SIGNED"
                  ? "text-sm font-semibold text-green-800 dark:text-green-300"
                  : latestAgreement.status === "SENT"
                  ? "text-sm font-semibold text-amber-800 dark:text-amber-300"
                  : "text-sm font-semibold text-zinc-700 dark:text-zinc-300"
              }>
                {latestAgreement.status === "SIGNED" ? "Agreement Signed ✓" :
                 latestAgreement.status === "SENT" ? "Agreement Sent — Awaiting Signature" :
                 "Agreement Draft"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {latestAgreement.title}
                {latestAgreement.status === "SIGNED" && latestAgreement.signedAt && (
                  <> — signed {new Date(latestAgreement.signedAt as string).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</>
                )}
              </p>
            </div>
            {latestAgreement.status === "SIGNED" && (
              <DownloadAgreementButton clientId={clientId} />
            )}
          </div>
        </div>
      )}

      <AgreementForm
        clientId={client.id}
        clientName={clientName}
        caseId={caseId}
        cases={(cases ?? []).map((c: Record<string, unknown>) => ({
          id: c.id as string,
          title: c.title as string,
          caseType: c.caseType as string,
        }))}
      />
    </div>
  );
}
