"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  FileText,
  DollarSign,
  Calendar,
  Clock,
  User,
  Briefcase,
  Shield,
  Scale,
  FileCheck,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Download,
  Eye,
  Signature as SignatureIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  agreementGenerateSchema,
  agreementTermsSchema,
  type AgreementGenerateInput,
} from "@/lib/api/validations";
import {
  ServiceTypeLabel,
  FeeStructureLabel,
  PaymentScheduleLabel,
  type ServiceType,
  type FeeStructure,
  type PaymentSchedule,
} from "@/types";
import { SignaturePad } from "./SignaturePad";

// ---------------------------------------------------------------------------
// AgreementForm — form for generating service agreements
// ---------------------------------------------------------------------------

// Extend schema for form-specific needs
const formSchema = agreementGenerateSchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AgreementFormProps {
  clientId: string;
  clientName: string;
  /** Pre-select a case (optional) */
  caseId?: string;
  /** Available cases for this client */
  cases?: { id: string; title: string; caseType: string }[];
  /** Called on successful generation */
  onGenerated?: (agreement: {
    id: string;
    title: string;
    pdfBase64: string;
    fileName: string;
  }) => void;
}

const SERVICE_TYPES = Object.entries(ServiceTypeLabel) as [ServiceType, string][];
const FEE_STRUCTURES = Object.entries(FeeStructureLabel) as [FeeStructure, string][];
const PAYMENT_SCHEDULES = Object.entries(PaymentScheduleLabel) as [PaymentSchedule, string][];

export function AgreementForm({
  clientId,
  clientName,
  caseId,
  cases = [],
  onGenerated,
}: AgreementFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<{
    base64: string;
    fileName: string;
  } | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId,
      caseId: caseId ?? null,
      title: "",
      description: "",
      serviceType: "full_service",
      feeAmount: 0,
      feeCurrency: "CAD",
      feeStructure: "flat",
      paymentSchedule: "upfront",
      startDate: "",
      endDate: "",
      terms: {
        scopeOfWork: "",
        feesAndPayment: "",
        clientResponsibilities: "",
        confidentiality: "",
        termination: "",
        governingLaw: "The laws of the Province of British Columbia and the federal laws of Canada applicable therein.",
        additionalClauses: [],
      },
    },
  });

  const serviceType = watch("serviceType");
  const feeStructure = watch("feeStructure");
  const paymentSchedule = watch("paymentSchedule");

  async function handleFormSubmit(data: FormValues) {
    setIsPending(true);
    setServerError(null);

    // Convert empty date strings to null
    const payload: AgreementGenerateInput & { signatureDataUrl?: string | null } = {
      ...data,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      signatureDataUrl: signatureDataUrl ?? null,
    };

    const res = await fetch("/api/agreements/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      setServerError(json.error?.message ?? "Failed to generate agreement");
      setIsPending(false);
      return;
    }

    setGeneratedPdf({
      base64: json.data.pdfBase64,
      fileName: json.data.fileName,
    });

    setIsPending(false);

    if (onGenerated) {
      onGenerated({
        id: json.data.agreement.id,
        title: json.data.agreement.title,
        pdfBase64: json.data.pdfBase64,
        fileName: json.data.fileName,
      });
    }
  }

  function handleDownload() {
    if (!generatedPdf) return;
    const byteChars = atob(generatedPdf.base64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const byteArr = new Uint8Array(byteNums);
    const blob = new Blob([byteArr], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generatedPdf.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Generated state --------------------------------------------------
  if (generatedPdf) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Agreement Generated
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Your service agreement has been created successfully
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          <FileCheck className="mb-3 h-10 w-10 text-green-500" />
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            PDF generated successfully
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {generatedPdf.fileName}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <Link
              href={`/clients/${clientId}`}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Back to Client
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Form state --------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            New Service Agreement
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            For {clientName}
          </p>
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
        <input type="hidden" {...register("clientId")} />

        {/* --- Agreement Details ---------------------------------------- */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Agreement Details
          </legend>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Agreement Title"
              icon={FileText}
              placeholder="e.g. Express Entry Representation Agreement"
              error={errors.title?.message}
              {...register("title")}
            />
            {cases.length > 0 && (
              <div className="space-y-1.5">
                <label
                  htmlFor="caseId"
                  className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                  Associated Case (optional)
                </label>
                <select
                  id="caseId"
                  {...register("caseId")}
                  className={cn(
                    "w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50",
                    "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
                    "border-zinc-200 dark:border-zinc-700",
                  )}
                >
                  <option value="">No case</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.caseType})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
              Description (optional)
            </label>
            <textarea
              id="description"
              rows={2}
              placeholder="Brief description of this agreementÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
              {...register("description")}
              className={cn(
                "w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
                "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
                "border-zinc-200 dark:border-zinc-700",
              )}
            />
          </div>
        </fieldset>

        {/* --- Service & Fee Details ------------------------------------ */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Service & Fee Details
          </legend>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Service Type */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                Service Type
              </label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_TYPES.map(([value, label]) => (
                  <label
                    key={value}
                    className={cn(
                      "cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      serviceType === value
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                    )}
                  >
                    <input
                      type="radio"
                      value={value}
                      className="sr-only"
                      {...register("serviceType")}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {errors.serviceType && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors.serviceType.message}
                </p>
              )}
            </div>

            {/* Fee Structure */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
                Fee Structure
              </label>
              <div className="flex flex-wrap gap-2">
                {FEE_STRUCTURES.map(([value, label]) => (
                  <label
                    key={value}
                    className={cn(
                      "cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      feeStructure === value
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                    )}
                  >
                    <input
                      type="radio"
                      value={value}
                      className="sr-only"
                      {...register("feeStructure")}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field
              label="Fee Amount"
              icon={DollarSign}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.feeAmount?.message}
              {...register("feeAmount", { valueAsNumber: true })}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="feeCurrency"
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
                Currency
              </label>
              <select
                id="feeCurrency"
                {...register("feeCurrency")}
                className={cn(
                  "w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50",
                  "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
                  "border-zinc-200 dark:border-zinc-700",
                )}
              >
                <option value="CAD">CAD ($)</option>
                <option value="USD">USD ($)</option>
                <option value="INR">INR (?)</option>
              </select>
            </div>
            {/* Payment Schedule */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                Payment Schedule
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_SCHEDULES.map(([value, label]) => (
                  <label
                    key={value}
                    className={cn(
                      "cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      paymentSchedule === value
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                    )}
                  >
                    <input
                      type="radio"
                      value={value}
                      className="sr-only"
                      {...register("paymentSchedule")}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Start Date (optional)"
              icon={Calendar}
              type="date"
              error={errors.startDate?.message}
              {...register("startDate")}
            />
            <Field
              label="End Date (optional)"
              icon={Calendar}
              type="date"
              error={errors.endDate?.message}
              {...register("endDate")}
            />
          </div>
        </fieldset>

        {/* --- Terms ---------------------------------------------------- */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Agreement Terms
          </legend>

          <TextareaField
            label="Scope of Work"
            icon={Briefcase}
            placeholder="Describe the services to be provided in detailÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
            rows={4}
            error={errors.terms?.scopeOfWork?.message}
            {...register("terms.scopeOfWork")}
          />

          <TextareaField
            label="Fees and Payment Terms"
            icon={DollarSign}
            placeholder="Detail the fee structure, payment milestones, and invoicing termsÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
            rows={4}
            error={errors.terms?.feesAndPayment?.message}
            {...register("terms.feesAndPayment")}
          />

          <TextareaField
            label="Client Responsibilities"
            icon={User}
            placeholder="List what the client must provide (documents, information, cooperation)ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
            rows={3}
            error={errors.terms?.clientResponsibilities?.message}
            {...register("terms.clientResponsibilities")}
          />

          <TextareaField
            label="Confidentiality"
            icon={Shield}
            placeholder="Confidentiality and data protection termsÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
            rows={3}
            error={errors.terms?.confidentiality?.message}
            {...register("terms.confidentiality")}
          />

          <TextareaField
            label="Termination"
            icon={FileCheck}
            placeholder="Conditions under which either party may terminate this agreementÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
            rows={3}
            error={errors.terms?.termination?.message}
            {...register("terms.termination")}
          />

          <Field
            label="Governing Law"
            icon={Scale}
            placeholder="e.g. The laws of the Province of British Columbia and the federal laws of Canada applicable therein."
            error={errors.terms?.governingLaw?.message}
            {...register("terms.governingLaw")}
          />
        </fieldset>

        {/* --- Signature ----------------------------------------------- */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <SignatureIcon className="mr-1.5 inline h-4 w-4" />
            Signature
          </legend>
          <SignaturePad
            onCapture={setSignatureDataUrl}
            clientName={clientName}
          />
        </fieldset>

        {/* --- Submit -------------------------------------------------- */}
        <div className="flex items-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
              "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isPending ? "GeneratingÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦" : "Generate Agreement"}
          </button>
          <Link
            href={`/clients/${clientId}`}
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

// --- Reusable Field Components ---------------------------------------------

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  error?: string;
}

function Field({ label, icon: Icon, error, className, id, ...inputProps }: FieldProps) {
  const fieldId = id ?? inputProps.name;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        <Icon className="h-3.5 w-3.5 text-zinc-400" />
        {label}
      </label>
      <input
        id={fieldId}
        className={cn(
          "w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
          "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
          error
            ? "border-red-300 dark:border-red-700"
            : "border-zinc-200 dark:border-zinc-700",
          className,
        )}
        {...inputProps}
      />
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  error?: string;
}

function TextareaField({ label, icon: Icon, error, id, ...props }: TextareaFieldProps) {
  const fieldId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        <Icon className="h-3.5 w-3.5 text-zinc-400" />
        {label}
      </label>
      <textarea
        id={fieldId}
        className={cn(
          "w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
          "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
          error
            ? "border-red-300 dark:border-red-700"
            : "border-zinc-200 dark:border-zinc-700",
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}