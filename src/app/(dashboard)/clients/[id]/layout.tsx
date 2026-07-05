import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientTabNav } from "@/components/clients/ClientTabNav";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ClientDetailLayout({ children, params }: LayoutProps) {
  const { organization } = await requireAuth();
  const { id: clientId } = await params;

  const { data: client } = await getSupabaseAdmin()
    .from("Client")
    .select("id, firstName, lastName")
    .eq("id", clientId)
    .eq("organizationId", organization.id)
    .single();

  if (!client) notFound();

  const fullName = `${client.firstName} ${client.lastName}`;

  return (
    <div className="space-y-0">
      {/* Breadcrumb + client name */}
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Clients
        </Link>
        <span className="text-sm text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{fullName}</span>
      </div>

      {/* Tab navigation */}
      <ClientTabNav clientId={clientId} />

      {/* Page content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
