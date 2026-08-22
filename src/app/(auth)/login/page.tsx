import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/clients");

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center px-4 py-12">
      {/* Brand wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-100/80 via-brand-50/40 to-transparent dark:from-brand-500/10 dark:via-brand-500/[0.03]"
      />
      <div className="relative">
        <LoginForm />
      </div>
    </div>
  );
}
