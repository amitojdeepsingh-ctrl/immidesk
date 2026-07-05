"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const updateSchema = z.object({
  action: z.string().min(1, "Action description is required").max(500),
  entityType: z.enum(["Case", "Document", "Email"], "Select a valid entity type"),
  entityId: z.string().min(1, "Entity ID is required").max(200),
});

type UpdateFormValues = z.infer<typeof updateSchema>;

interface AddUpdateFormProps {
  caseId: string;
  clientId: string;
  onUpdate: () => void;
}

export function AddUpdateForm({ caseId, clientId, onUpdate }: AddUpdateFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      entityType: "Case",
      entityId: caseId,
    },
  });

  async function onSubmit(data: UpdateFormValues) {
    setSubmitting(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create update");

      reset();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onUpdate();
    } catch {
      // Error handled silently — form remains for retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="action"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Action Description
        </label>
        <textarea
          id="action"
          rows={3}
          className={cn(
            "mt-1 w-full rounded-md border px-3 py-2 text-sm transition-colors",
            "bg-white text-zinc-900 placeholder:text-zinc-400",
            "focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
            "dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
            "dark:focus:ring-zinc-50/20",
            errors.action
              ? "border-red-300 dark:border-red-700"
              : "border-zinc-200 dark:border-zinc-700",
          )}
          placeholder="e.g. Submitted additional documents to IRCC..."
          {...register("action")}
        />
        {errors.action && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {errors.action.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="entityType"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Entity Type
          </label>
          <select
            id="entityType"
            className={cn(
              "mt-1 w-full rounded-md border px-3 py-2 text-sm transition-colors",
              "bg-white text-zinc-900",
              "focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
              "dark:bg-zinc-900 dark:text-zinc-50",
              "dark:focus:ring-zinc-50/20",
              errors.entityType
                ? "border-red-300 dark:border-red-700"
                : "border-zinc-200 dark:border-zinc-700",
            )}
            {...register("entityType")}
          >
            <option value="Case">Case</option>
            <option value="Document">Document</option>
            <option value="Email">Email</option>
          </select>
          {errors.entityType && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.entityType.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="entityId"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Entity ID
          </label>
          <input
            id="entityId"
            type="text"
            className={cn(
              "mt-1 w-full rounded-md border px-3 py-2 text-sm transition-colors",
              "bg-white text-zinc-900 placeholder:text-zinc-400",
              "focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
              "dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
              "dark:focus:ring-zinc-50/20",
              errors.entityId
                ? "border-red-300 dark:border-red-700"
                : "border-zinc-200 dark:border-zinc-700",
            )}
            placeholder="Entity ID"
            {...register("entityId")}
          />
          {errors.entityId && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.entityId.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {success && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Update added
          </span>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            "bg-zinc-900 text-white hover:bg-zinc-800",
            "dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Add Update
        </button>
      </div>
    </form>
  );
}
