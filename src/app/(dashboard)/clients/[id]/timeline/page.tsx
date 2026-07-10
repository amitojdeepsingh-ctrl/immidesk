import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { TimelineView } from "./timeline-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TimelinePage({ params }: PageProps) {
  const { organization } = await requireAuth();
  const { id: clientId } = await params;
  const supabase = getSupabaseAdmin();
  const orgId = organization.id;

  const { data: client } = await supabase
    .from("Client")
    .select("id, firstName, lastName")
    .eq("id", clientId)
    .eq("organizationId", orgId)
    .single();

  if (!client) notFound();

  const { data: orgCases } = await supabase
    .from("Case")
    .select("id")
    .eq("organizationId", orgId)
    .eq("clientId", clientId);
  const caseIds = (orgCases ?? []).map(c => c.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = [];

  const { data: activityLogs } = await supabase
    .from("ActivityLog")
    .select("*")
    .eq("organizationId", orgId)
    .or(`entityType.eq.Client,entityId.eq.${clientId}`)
    .order("timestamp", { ascending: false })
    .limit(50);

  for (const log of activityLogs ?? []) {
    events.push({ ...log, _type: "activity", _date: log.timestamp });
  }

  if (caseIds.length > 0) {
    const { data: portalMessages } = await supabase
      .from("PortalMessage")
      .select("id, content, senderName, sentByClient, createdAt")
      .eq("clientId", clientId)
      .order("createdAt", { ascending: false })
      .limit(20);

    for (const msg of portalMessages ?? []) {
      events.push({ _type: "portal_message", _date: msg.createdAt, ...msg });
    }

    const { data: agreements } = await supabase
      .from("ServiceAgreement")
      .select("id, title, status, feeAmount, feeCurrency, signedAt, createdAt")
      .eq("clientId", clientId)
      .order("createdAt", { ascending: false });

    for (const ag of agreements ?? []) {
      if (ag.signedAt) {
        events.push({ _type: "agreement_signed", _date: ag.signedAt, agreementTitle: ag.title, feeAmount: ag.feeAmount, feeCurrency: ag.feeCurrency });
      }
    }

    const { data: payments } = await supabase
      .from("Payment")
      .select("id, amount, currency, paymentMethod, paymentDate, notes")
      .eq("clientId", clientId)
      .order("paymentDate", { ascending: false });

    for (const pmt of payments ?? []) {
      events.push({ _type: "payment", _date: pmt.paymentDate, ...pmt });
    }
  }

  events.sort((a, b) => new Date(b._date as string).getTime() - new Date(a._date as string).getTime());

  return <TimelineView clientName={`${client.firstName} ${client.lastName}`} events={events as any} />;
}
