import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { LmiaTracker } from "./lmia-tracker";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LmiaPage({ params }: PageProps) {
  const { organization } = await requireAuth();
  const { id: clientId } = await params;
  const db = getSupabaseAdmin();

  // Verify client belongs to org
  const { data: client } = await db
    .from("Client")
    .select("id, firstName, lastName")
    .eq("id", clientId)
    .eq("organizationId", organization.id)
    .single();

  if (!client) notFound();

  const [{ data: ads }, { data: applicants }] = await Promise.all([
    db.from("LmiaAd")
      .select("*")
      .eq("clientId", clientId)
      .eq("organizationId", organization.id)
      .order("datePosted", { ascending: false }),
    db.from("LmiaApplicant")
      .select("*")
      .eq("clientId", clientId)
      .eq("organizationId", organization.id)
      .order("contactDate", { ascending: false }),
  ]);

  return (
    <LmiaTracker
      clientId={clientId}
      initialAds={ads ?? []}
      initialApplicants={applicants ?? []}
    />
  );
}
