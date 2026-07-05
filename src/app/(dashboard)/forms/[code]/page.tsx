import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { FormFillerShell } from "@/components/forms/FormFillerShell";
import type { FormField, PrefillData } from "@/components/forms/FormFillerFieldList";

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ clientId?: string; caseId?: string }>;
}

export default async function FormFillerPage({ params, searchParams }: PageProps) {
  const { organization } = await requireAuth();
  const { code } = await params;
  const { clientId, caseId } = await searchParams;
  const supabase = getSupabaseAdmin();

  // Load template
  const { data: template, error: tmplErr } = await supabase
    .from("IMMFormTemplate")
    .select("*")
    .eq("formCode", code)
    .eq("isActive", true)
    .single();

  if (tmplErr || !template) notFound();

  // Parse field schema
  const rawSchema = template.fieldSchema as unknown;
  const fieldSchema = rawSchema as { fields: FormField[] } | FormField[];
  const fields: FormField[] = Array.isArray(fieldSchema)
    ? (fieldSchema as unknown as FormField[])
    : ((fieldSchema as { fields?: FormField[] })?.fields ?? []);

  // Load client info if provided
  let clientName: string | undefined;
  if (clientId) {
    const { data: client } = await supabase
      .from("Client")
      .select("firstName, lastName")
      .eq("id", clientId)
      .eq("organizationId", organization.id)
      .single();
    if (client) {
      clientName = `${client.firstName} ${client.lastName}`;
    }
  }

  // Check for existing submission
  let submissionId: string | undefined;
  let initialData: PrefillData = {};

  if (caseId) {
    const { data: existing } = await supabase
      .from("IMMFormSubmission")
      .select("id, filledData")
      .eq("caseId", caseId)
      .eq("templateId", template.id)
      .maybeSingle();

    if (existing) {
      submissionId = existing.id;
      const rawData = existing.filledData as unknown;
      initialData = (rawData as PrefillData) ?? {};
    }
  }

  return (
    <FormFillerShell
      formCode={template.formCode}
      formName={template.formName}
      formVersion={template.version}
      templateId={template.id}
      fields={fields}
      initialData={initialData}
      clientId={clientId}
      caseId={caseId}
      submissionId={submissionId}
      clientName={clientName}
    />
  );
}
