import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { CaseTypeLabel, IMMFormStatus } from "@/types";
import type { CaseType, IMMFormStatus as IMMFormStatusType } from "@/types";
import { SOPViewer } from "@/components/application/SOPViewer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientApplicationPage({ params }: PageProps) {
  const { organization } = await requireAuth();
  const { id: clientId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: client } = await supabase
    .from("Client")
    .select("id, firstName, lastName, notes")
    .eq("id", clientId)
    .eq("organizationId", organization.id)
    .single();

  if (!client) notFound();

  const { data: cases } = await supabase
    .from("Case")
    .select("id, title, caseType, createdAt, notes")
    .eq("clientId", clientId)
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: false })
    .limit(1);

  const caseRecord = cases?.[0] ?? null;

  let immFormSubmissions: Record<string, unknown>[] = [];

  if (caseRecord) {
    const { data: submissions } = await supabase
      .from("IMMFormSubmission")
      .select("id, templateId, status, createdAt, updatedAt, submittedAt, template:IMMFormTemplate!inner(formCode, formName)")
      .eq("caseId", caseRecord.id)
      .order("updatedAt", { ascending: false });

    immFormSubmissions = (submissions ?? []).map((s: Record<string, unknown>) => {
      const template = s.template as Record<string, string> | undefined;
      return {
        id: s.id as string,
        templateId: s.templateId as string,
        formCode: template?.formCode ?? "",
        formName: template?.formName ?? "",
        status: s.status as string,
        createdAt: typeof s.createdAt === "string" ? s.createdAt : new Date(s.createdAt as Date).toISOString(),
        updatedAt: typeof s.updatedAt === "string" ? s.updatedAt : new Date(s.updatedAt as Date).toISOString(),
        submittedAt: s.submittedAt ? (typeof s.submittedAt === "string" ? s.submittedAt : new Date(s.submittedAt as Date).toISOString()) : null,
      };
    });
  }

  const serializedCase = caseRecord
    ? {
        id: caseRecord.id,
        title: caseRecord.title,
        caseType: caseRecord.caseType,
        createdAt: typeof caseRecord.createdAt === "string" ? caseRecord.createdAt : new Date(caseRecord.createdAt as Date).toISOString(),
        immFormSubmissions,
      }
    : null;

  const hasSop = (client.notes as string)?.includes("<!--SOP-->") ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/clients/${clientId}`}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Application
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {client.firstName} {client.lastName}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Statement of Purpose (SOP)
        </h2>
        <SOPViewer caseId={serializedCase?.id ?? ""} existingSop={hasSop ? undefined : undefined} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Form Submissions
          </h2>
          <Link
            href={`/clients/${clientId}/application/prefill`}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Pre-fill New Form
          </Link>
        </div>

        {serializedCase && immFormSubmissions.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Form</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {immFormSubmissions.map((sub) => (
                  <tr key={sub.id as string} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">{sub.formName as string}</span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{sub.formCode as string}</td>
                    <td className="px-4 py-2.5">
                      <FormStatusBadge status={sub.status as IMMFormStatusType} />
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                      {sub.updatedAt ? new Date(sub.updatedAt as string).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-12 dark:border-zinc-700">
            <FileText className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No form submissions yet</p>
            <Link
              href={`/clients/${clientId}/application/prefill`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Pre-fill First Form
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function FormStatusBadge({ status }: { status: IMMFormStatusType }) {
  const colors: Record<IMMFormStatusType, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    COMPLETE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    SUBMITTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", colors[status])}>
      {IMMFormStatus[status]}
    </span>
  );
}
