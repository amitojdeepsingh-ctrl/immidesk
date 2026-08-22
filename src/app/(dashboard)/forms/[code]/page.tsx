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

  // ── Auto-fill suggestions from the client's PIS intake + Client record ──
  // Only for fields the user hasn't already saved in a submission.
  let prefillSuggestions: PrefillData = {};
  if (clientId && Object.keys(initialData).length < fields.length) {
    const [pisRes, clientRes] = await Promise.all([
      supabase
        .from("IMMFormSubmission")
        .select("filledData, template:IMMFormTemplate(formCode)")
        .eq("caseId", caseId ?? "")
        .order("createdAt", { ascending: true }),
      supabase
        .from("Client")
        .select("*")
        .eq("id", clientId)
        .eq("organizationId", organization.id)
        .single(),
    ]);

    const profile: Record<string, unknown> = { ...(clientRes.data ?? {}) };
    for (const row of pisRes.data ?? []) {
      const tmpl = Array.isArray(row.template) ? row.template[0] : row.template;
      const fc = (tmpl as { formCode?: string } | null)?.formCode;
      if (fc !== "IMM_PIS") continue; // only the Personal Information Sheet feeds forms
      const d = (row.filledData ?? {}) as Record<string, unknown>;
      for (const [k, v] of Object.entries(d)) {
        if (["education", "employment", "travel", "addressHistory", "statutory", "_meta"].includes(k)) continue;
        if (v === null || v === undefined || v === "" || typeof v === "object") continue;
        profile[k] = v;
      }
    }

    try {
      const { prefillForm } = await import("@/lib/ai/form-filler");
      const suggestions = await prefillForm(
        fields,
        profile as Record<string, string | number | boolean | null | undefined>,
      );
      // Never override data the user already saved
      prefillSuggestions = Object.fromEntries(
        Object.entries(suggestions).filter(([k]) => initialData[k] === undefined || initialData[k] === ""),
      );
    } catch (e) {
      console.warn("PIS prefill failed:", e);
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
      prefillSuggestions={prefillSuggestions}
      clientId={clientId}
      caseId={caseId}
      submissionId={submissionId}
      clientName={clientName}
    />
  );
}
