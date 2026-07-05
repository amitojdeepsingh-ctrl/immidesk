import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { LmiaCaseTracker } from "./lmia-case-tracker";

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function LmiaCasePage({ params }: PageProps) {
  const { caseId } = await params;
  const { organization } = await requireAuth();
  const db = getSupabaseAdmin();

  const [{ data: lmiaCase }, { data: ads }, { data: applicants }] = await Promise.all([
    db.from("LmiaCase").select("*").eq("id", caseId).eq("organizationId", organization.id).single(),
    db.from("LmiaAd").select("*").eq("lmiaCaseId", caseId).eq("organizationId", organization.id).order("startDate", { ascending: false }),
    db.from("LmiaApplicant").select("*").eq("lmiaCaseId", caseId).eq("organizationId", organization.id).order("appliedDate", { ascending: false }),
  ]);

  if (!lmiaCase) notFound();

  return (
    <LmiaCaseTracker
      lmiaCase={lmiaCase}
      initialAds={ads ?? []}
      initialApplicants={applicants ?? []}
    />
  );
}
