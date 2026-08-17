// ═══════════════════════════════════════════════════════════════════════════
// ImmigDesk — Client Portal Intake Page (Personal Information Sheet)
// ═══════════════════════════════════════════════════════════════════════════
// Route: /intake/[token]
// Public page (no session required). Clients visit via a secure tokenized link
// to complete the multi-applicant PIS for their case.
// ═══════════════════════════════════════════════════════════════════════════

import { verifyPortalToken } from "@/lib/portal-token";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { FileText, ClipboardList } from "lucide-react";
import IntakeForm, { type ExistingSubmission } from "./intake-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function IntakePage({ params }: PageProps) {
  const { token } = await params;

  const payload = verifyPortalToken(token);
  if (!payload) return <InvalidTokenView />;

  const supabase = getSupabaseAdmin();

  const { data: caseRecord } = await supabase
    .from("Case")
    .select(
      "id, title, caseType, organizationId, clientId, client:Client!inner(firstName, lastName), organization:Organization!inner(name)",
    )
    .eq("id", payload.caseId)
    .single();

  if (
    !caseRecord ||
    caseRecord.organizationId !== payload.organizationId ||
    caseRecord.clientId !== payload.clientId
  ) {
    return <InvalidTokenView />;
  }

  const client = Array.isArray(caseRecord.client) ? caseRecord.client[0] : caseRecord.client;
  const org = Array.isArray(caseRecord.organization) ? caseRecord.organization[0] : caseRecord.organization;

  // Existing per-applicant PIS submissions (for prefill + edit resumption)
  const { data: subs } = await supabase
    .from("IMMFormSubmission")
    .select("applicantLabel, status, filledData")
    .eq("caseId", payload.caseId)
    .order("createdAt", { ascending: true });

  const existing: ExistingSubmission[] = (subs ?? []).map((s) => ({
    applicantLabel: s.applicantLabel as string,
    status: s.status as string,
    filledData: (s.filledData ?? {}) as Record<string, unknown>,
  }));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Slim public header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {org?.name ?? "Immigration Services"}
            </span>
          </div>
          <span className="text-xs text-zinc-400">
            {caseRecord.title} · {client?.firstName} {client?.lastName}
          </span>
        </div>
      </header>

      <IntakeForm
        token={token}
        caseId={payload.caseId}
        defaultProgramType={(caseRecord.caseType as string) ?? ""}
        clientName={`${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim()}
        existing={existing}
      />
    </div>
  );
}

// ─── Invalid/Expired Token View ────────────────────────────────────────────

function InvalidTokenView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          <FileText className="h-6 w-6 text-red-500 dark:text-red-400" />
        </div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Link Expired or Invalid
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          This intake link is no longer valid. It may have expired or already
          been used. Please contact your representative for a new link.
        </p>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";