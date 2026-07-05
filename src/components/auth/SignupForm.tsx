"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Mail,
  Lock,
  User,
  Building2,
  UserPlus,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { signupSchema, type SignupInput } from "@/lib/auth-schemas";
import { signupAction } from "@/lib/auth-actions";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      organizationName: "",
    },
  });

  async function onSubmit(data: SignupInput) {
    setIsPending(true);
    setServerError(null);

    try {
      const result = await signupAction(data);

      if (result.success) {
        router.push("/clients");
      } else {
        setServerError(result.error);
        setIsPending(false);
      }
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "An unexpected error occurred");
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-sm space-y-5"
      noValidate
    >
      {/* Heading */}
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create your account
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Set up your ImmigDesk workspace
        </p>
      </div>

      {/* Server error banner */}
      {serverError && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Full name
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Amitoj Singh"
            {...register("name")}
            className={cn(
              "w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
              "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
              errors.name
                ? "border-red-300 dark:border-red-700"
                : "border-zinc-200 dark:border-zinc-700",
            )}
          />
        </div>
        {errors.name && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Organization name */}
      <div className="space-y-1.5">
        <label
          htmlFor="organizationName"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Organization name
        </label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="organizationName"
            type="text"
            autoComplete="organization"
            placeholder="Singh Immigration Services"
            {...register("organizationName")}
            className={cn(
              "w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
              "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
              errors.organizationName
                ? "border-red-300 dark:border-red-700"
                : "border-zinc-200 dark:border-zinc-700",
            )}
          />
        </div>
        {errors.organizationName && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {errors.organizationName.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
            className={cn(
              "w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
              "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
              errors.email
                ? "border-red-300 dark:border-red-700"
                : "border-zinc-200 dark:border-zinc-700",
            )}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            {...register("password")}
            className={cn(
              "w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
              "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
              errors.password
                ? "border-red-300 dark:border-red-700"
                : "border-zinc-200 dark:border-zinc-700",
            )}
          />
        </div>
        {errors.password && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Confirm password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            {...register("confirmPassword")}
            className={cn(
              "w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
              "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
              errors.confirmPassword
                ? "border-red-300 dark:border-red-700"
                : "border-zinc-200 dark:border-zinc-700",
            )}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
          "focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        {isPending ? "Creating account…" : "Create account"}
      </button>

      {/* Login link */}
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
