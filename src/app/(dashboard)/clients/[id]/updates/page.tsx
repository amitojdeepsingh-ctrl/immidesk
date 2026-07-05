import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { UpdateTimeline } from "@/components/updates/UpdateTimeline";
import { AddUpdateForm } from "@/components/updates/AddUpdateForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientUpdatesPage({ params }: PageProps) {
  const { organization } = await requireAuth();
  const { id: clientId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: client } = await supabase
    .from("Client")
    .select("id, firstName, lastName, email")
    .eq("id", clientId)
    .eq("organizationId", organization.id)
    .single();

  if (!client) notFound();

  const { data: cases } = await supabase
    .from("Case")
    .select("id, title, caseType, status")
    .eq("clientId", clientId)
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: false })
    .limit(1);

  const activeCase = cases?.[0] ?? null;

  let activityLogs: Record<string, unknown>[] = [];
  if (activeCase) {
    // Fetch logs by clientId OR caseId, using a left join so logs with userId="system" don't crash
    const { data: logs } = await supabase
      .from("ActivityLog")
      .select("id, action, entityType, entityId, metadata, timestamp, user:User(name, email)")
      .eq("organizationId", organization.id)
      .or(`entityId.eq.${activeCase.id},entityId.eq.${clientId}`)
      .order("timestamp", { ascending: false });
    activityLogs = logs ?? [];
  }

  const serializedUpdates = activityLogs.map((log: Record<string, unknown>) => {
    const user = log.user as Record<string, string> | undefined;
    return {
      id: log.id as string,
      action: log.action as string,
      entityType: log.entityType as string,
      entityId: log.entityId as string,
      metadata: log.metadata as Record<string, unknown>,
      timestamp: typeof log.timestamp === "string" ? log.timestamp : new Date(log.timestamp as Date).toISOString(),
      user: user ? { name: user.name, email: user.email } : undefined,
    };
  });

  const clientName = `${client.firstName} ${client.lastName}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Updates</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {activityLogs.length} log{activityLogs.length !== 1 ? "s" : ""}
        </p>
      </div>

      {!activeCase ? (
        <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No case exists for this client yet. Create a case first to track updates.
          </p>
          <Link
            href={`/clients/${clientId}`}
            className="mt-2 inline-block text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
          >
            View client profile &rarr;
          </Link>
        </div>
      ) : (
        <>
          <section>
            <UpdateTimeline updates={serializedUpdates} caseId={activeCase.id as string} />
          </section>
          <section className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Add Update
            </h2>
            <AddUpdateForm caseId={activeCase.id as string} clientId={clientId} onUpdate={() => {}} />
          </section>
        </>
      )}
    </div>
  );
}
