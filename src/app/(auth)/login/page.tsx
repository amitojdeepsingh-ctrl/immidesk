import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/clients");

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <LoginForm />
    </div>
  );
}
