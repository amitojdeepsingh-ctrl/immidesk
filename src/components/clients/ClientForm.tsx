"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Globe,
  FileText,
  MapPin,
  Building2,
  Heart,
  Users,
  Tag,
  Save,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { clientCreateSchema, type ClientCreateInput } from "@/lib/api/validations";

// ═══════════════════════════════════════════════════════════════════════════
// ClientForm — reusable form for creating and editing clients
// ═══════════════════════════════════════════════════════════════════════════

// Schema for the form — extends the API schema with tag input as string
const formSchema = clientCreateSchema.extend({
  tags: z.string().optional(), // comma-separated in the form
});

type FormValues = z.infer<typeof formSchema>;

interface ClientFormProps {
  /** Pre-populate form for editing. Omit for create mode. */
  defaultValues?: Partial<ClientCreateInput> & { id?: string };
  /** Called on successful submit. Receives the form data ready for API. */
  onSubmit: (data: ClientCreateInput) => Promise<{ success: boolean; error?: string }>;
  /** Called when user confirms delete (edit mode only). */
  onDelete?: () => Promise<{ success: boolean; error?: string }>;
  /** Whether the form is in edit mode. */
  mode?: "create" | "edit";
}

export function ClientForm({
  defaultValues,
  onSubmit,
  onDelete,
  mode = "create",
}: ClientFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Convert tags array to comma-separated string for the form
  const tagsString = defaultValues?.tags?.join(", ") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      dateOfBirth: defaultValues?.dateOfBirth
        ? new Date(defaultValues.dateOfBirth).toISOString().split("T")[0]
        : "",
      nationality: defaultValues?.nationality ?? "",
      passportNumber: defaultValues?.passportNumber ?? "",
      passportExpiry: defaultValues?.passportExpiry
        ? new Date(defaultValues.passportExpiry).toISOString().split("T")[0]
        : "",
      workPermitExpiry: defaultValues?.workPermitExpiry
        ? new Date(defaultValues.workPermitExpiry).toISOString().split("T")[0]
        : "",
      maritalStatus: defaultValues?.maritalStatus ?? "",
      spouseName: defaultValues?.spouseName ?? "",
      addressLine1: defaultValues?.addressLine1 ?? "",
      addressLine2: defaultValues?.addressLine2 ?? "",
      city: defaultValues?.city ?? "",
      province: defaultValues?.province ?? "",
      postalCode: defaultValues?.postalCode ?? "",
      country: defaultValues?.country ?? "",
      notes: defaultValues?.notes ?? "",
      tags: tagsString,
    },
  });

  async function handleFormSubmit(data: FormValues) {
    setIsPending(true);
    setServerError(null);

    // Convert tags string to array
    const tagsArray = data.tags
      ? data.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    // Convert empty date strings to null
    const payload: ClientCreateInput = {
      ...data,
      dateOfBirth: data.dateOfBirth || null,
      passportExpiry: data.passportExpiry || null,
      workPermitExpiry: data.workPermitExpiry || null,
      tags: tagsArray,
    };

    const result = await onSubmit(payload);

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong");
      setIsPending(false);
    }
    // On success, the parent page handles navigation
  }

  async function handleDelete() {
    if (!onDelete) return;
    setIsDeleting(true);
    const result = await onDelete();
    if (!result.success) {
      setServerError(result.error ?? "Failed to delete client");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
    // On success, parent handles navigation
  }

  const heading = mode === "create" ? "New Client" : "Edit Client";
  const submitLabel = mode === "create" ? "Create client" : "Save changes";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {heading}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {mode === "create"
                ? "Add a new client to your organization"
                : `Editing ${defaultValues?.firstName ?? ""} ${defaultValues?.lastName ?? ""}`}
            </p>
          </div>
        </div>
        {mode === "edit" && onDelete && (
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  {isDeleting ? "Deleting…" : "Confirm delete"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Server error banner */}
      {serverError && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="space-y-8"
        noValidate
      >
        {/* ─── Personal Information ─────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Personal Information
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              icon={User}
              placeholder="John"
              error={errors.firstName?.message}
              {...register("firstName")}
            />
            <Field
              label="Last name"
              icon={User}
              placeholder="Doe"
              error={errors.lastName?.message}
              {...register("lastName")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              icon={Mail}
              type="email"
              placeholder="john@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Field
              label="Phone"
              icon={Phone}
              type="tel"
              placeholder="+1 (555) 000-0000"
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Date of birth"
              icon={Calendar}
              type="date"
              error={errors.dateOfBirth?.message}
              {...register("dateOfBirth")}
            />
            <Field
              label="Nationality"
              icon={Globe}
              placeholder="e.g. Indian, Canadian"
              error={errors.nationality?.message}
              {...register("nationality")}
            />
            <Field
              label="Marital status"
              icon={Heart}
              placeholder="Single, Married, etc."
              error={errors.maritalStatus?.message}
              {...register("maritalStatus")}
            />
          </div>
          <Field
            label="Spouse name"
            icon={Users}
            placeholder="Spouse full name (if applicable)"
            error={errors.spouseName?.message}
            {...register("spouseName")}
          />
        </fieldset>

        {/* ─── Passport Information ──────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Passport Information
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Passport number"
              icon={FileText}
              placeholder="e.g. A1234567"
              error={errors.passportNumber?.message}
              {...register("passportNumber")}
            />
            <Field
              label="Passport expiry"
              icon={Calendar}
              type="date"
              error={errors.passportExpiry?.message}
              {...register("passportExpiry")}
            />
            <Field
              label="Work permit expiry"
              icon={Calendar}
              type="date"
              error={errors.workPermitExpiry?.message}
              {...register("workPermitExpiry")}
            />
          </div>
        </fieldset>

        {/* ─── Address ──────────────────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Address
          </legend>
          <Field
            label="Address line 1"
            icon={MapPin}
            placeholder="123 Main Street"
            error={errors.addressLine1?.message}
            {...register("addressLine1")}
          />
          <Field
            label="Address line 2"
            icon={Building2}
            placeholder="Apt, Suite, Unit (optional)"
            error={errors.addressLine2?.message}
            {...register("addressLine2")}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="City"
              icon={MapPin}
              placeholder="Vancouver"
              error={errors.city?.message}
              {...register("city")}
            />
            <Field
              label="Province / State"
              icon={MapPin}
              placeholder="British Columbia"
              error={errors.province?.message}
              {...register("province")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Postal / ZIP code"
              icon={MapPin}
              placeholder="V6B 1A1"
              error={errors.postalCode?.message}
              {...register("postalCode")}
            />
            <Field
              label="Country"
              icon={Globe}
              placeholder="Canada"
              error={errors.country?.message}
              {...register("country")}
            />
          </div>
        </fieldset>

        {/* ─── Notes & Tags ─────────────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Notes & Tags
          </legend>
          <div className="space-y-1.5">
            <label
              htmlFor="notes"
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
              Notes
            </label>
            <textarea
              id="notes"
              rows={4}
              placeholder="Any relevant notes about this client…"
              {...register("notes")}
              className={cn(
                "w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
                "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
                errors.notes
                  ? "border-red-300 dark:border-red-700"
                  : "border-zinc-200 dark:border-zinc-700",
              )}
            />
            {errors.notes && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors.notes.message}
              </p>
            )}
          </div>
          <Field
            label="Tags"
            icon={Tag}
            placeholder="Express Entry, PNP, Priority (comma-separated)"
            error={errors.tags?.message}
            {...register("tags")}
          />
        </fieldset>

        {/* ─── Submit ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <button
            type="submit"
            disabled={isPending || (mode === "edit" && !isDirty)}
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
            {isPending
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : submitLabel}
          </button>
          <Link
            href="/clients"
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

// ─── Reusable Field Component ──────────────────────────────────────────────

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
