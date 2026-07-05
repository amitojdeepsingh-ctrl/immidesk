import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FileSpreadsheet, Sparkles, ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PrefillFormPage({ params }: PageProps) {
  const { organization } = await requireAuth();
  const { id: clientId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: client } = await supabase
    .from("Client")
    .select("id, firstName, lastName")
    .eq("id", clientId)
    .eq("organizationId", organization.id)
    .single();

  if (!client) notFound();

  const { data: cases } = await supabase
    .from("Case")
    .select("id, title, caseType")
    .eq("clientId", clientId)
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: false })
    .limit(1);

  const caseRecord = cases?.[0] ?? null;
  if (!caseRecord) {
    redirect(`/clients/${clientId}`);
    return null;
  }

  const { data: templates } = await supabase
    .from("IMMFormTemplate")
    .select("*, submissions:IMMFormSubmission!left(caseId, status)")
    .eq("isActive", true)
    .order("formName", { ascending: true });

  const templatesList = (templates ?? []).map((t) => ({
    ...t,
    fieldSchema: typeof t.fieldSchema === "string" ? JSON.parse(t.fieldSchema) : t.fieldSchema,
    submissionStatus: (t.submissions as Array<{ caseId: string; status: string }> | undefined)
      ?.filter((s) => s.caseId === caseRecord.id)
      .map((s) => s.status)[0] ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/clients/${clientId}/application`}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Pre-fill a Form
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {client.firstName} {client.lastName} &middot; {caseRecord.title}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templatesList.map((template) => {
          const fields = Array.isArray(template.fieldSchema)
            ? template.fieldSchema
            : template.fieldSchema?.fields ?? [];

          return (
            <Link
              key={template.id}
              href={`/forms/${template.formCode}?clientId=${clientId}&caseId=${caseRecord.id}`}
              className="group relative rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-zinc-900 group-hover:text-purple-600 dark:text-zinc-50 dark:group-hover:text-purple-400">
                    {template.formName}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {template.formCode} &middot; {fields.length} fields
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs text-purple-600 dark:text-purple-400">
                  AI Auto-Fill Available
                </span>
              </div>

              {template.submissionStatus && (
                <div className="absolute right-3 top-3">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {template.submissionStatus === "COMPLETE" ? "Complete" : "Draft"}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
