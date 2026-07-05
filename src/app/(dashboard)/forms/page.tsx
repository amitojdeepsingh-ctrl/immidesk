import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { FileText, FileSpreadsheet, ExternalLink, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ clientId?: string; caseId?: string }>;
}

export default async function FormsLibraryPage({ searchParams }: PageProps) {
  const { organization } = await requireAuth();
  const { clientId, caseId } = await searchParams;
  const supabase = getSupabaseAdmin();

  const { data: templates } = await supabase
    .from("IMMFormTemplate")
    .select("*")
    .eq("isActive", true)
    .order("formName", { ascending: true });

  const templatesList = (templates ?? []).map((t) => ({
    ...t,
    fieldSchema: typeof t.fieldSchema === "string" ? JSON.parse(t.fieldSchema) : t.fieldSchema,
  }));

  const { data: submissions } = await supabase
    .from("IMMFormSubmission")
    .select("templateId, status")
    .in("templateId", templatesList.map((t) => t.id));

  const submissionCounts: Record<string, { DRAFT: number; COMPLETE: number; SUBMITTED: number }> = {};
  for (const s of submissions ?? []) {
    if (!submissionCounts[s.templateId]) {
      submissionCounts[s.templateId] = { DRAFT: 0, COMPLETE: 0, SUBMITTED: 0 };
    }
    const status = s.status as keyof (typeof submissionCounts)[string];
    if (submissionCounts[s.templateId][status] !== undefined) {
      submissionCounts[s.templateId][status]++;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            IMM Form Library
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Select an IRCC form to fill with auto-populated client data
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templatesList.map((template) => {
          const fields = Array.isArray(template.fieldSchema)
            ? template.fieldSchema
            : template.fieldSchema?.fields ?? [];
          const counts = submissionCounts[template.id] ?? { DRAFT: 0, COMPLETE: 0, SUBMITTED: 0 };
          const href = clientId && caseId
            ? `/forms/${template.formCode}?clientId=${clientId}&caseId=${caseId}`
            : `/forms/${template.formCode}`;

          return (
            <Link
              key={template.id}
              href={href}
              className="group rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-zinc-900 group-hover:text-blue-600 dark:text-zinc-50 dark:group-hover:text-blue-400">
                    {template.formName}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {template.formCode} &middot; v{template.version}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{fields.length} fields</span>
                {counts.DRAFT > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {counts.DRAFT} draft{counts.DRAFT > 1 ? "s" : ""}
                  </span>
                )}
                {counts.COMPLETE > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    {counts.COMPLETE} complete
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
                <ExternalLink className="h-3 w-3" />
                <span>Open form filler</span>
              </div>
            </Link>
          );
        })}
      </div>

      {templatesList.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          <FlaskConical className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            No form templates configured yet
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Seed the database with form templates first
          </p>
          <code className="mt-3 rounded-md bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            npx tsx scripts/seed-forms.ts
          </code>
        </div>
      )}
    </div>
  );
}
