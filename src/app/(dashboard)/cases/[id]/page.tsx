import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  FileText,
  Hash,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CASE_TYPE_LABELS } from "@/lib/checklists";
import { DocumentList } from "@/components/documents/DocumentList";
import type { DocumentItem } from "@/components/documents/DocumentList";
import { getPresignedDownloadUrl, StorageBuckets } from "@/lib/storage";
import type { DocumentCategory } from "@/types";
import { CASE_STATUS_STYLES, PRIORITY_STYLES } from "../case-styles";
import { CaseStatusSelect, CasePrioritySelect } from "./case-status-select";
import { CaseTasks } from "./case-tasks";

interface PageProps {
  params: Promise<{ id: string }>;
}

const fmtDate = (v: unknown): string => {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : new Date(v as Date);
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
};

export default async function CaseDetailPage({ params }: PageProps) {
  const { organization } = await requireAuth();
  const { id: caseId } = await params;
  const supabase = getSupabaseAdmin();
  const orgId = organization.id;

  const { data: kase } = await supabase
    .from("Case")
    .select(
      `id, title, description, caseType, status, priority, deadlineDate, createdAt,
       irccApplicationNumber, uciNumber, submissionDate, aorDate, decisionDate, decisionResult, notes,
       clientId,
       client:Client!inner(id, firstName, lastName, email),
       assignedTo:User(id, name)`,
    )
    .eq("id", caseId)
    .eq("organizationId", orgId)
    .maybeSingle();

  if (!kase) notFound();

  const client = Array.isArray(kase.client) ? kase.client[0] : kase.client;
  const assignedTo = Array.isArray(kase.assignedTo) ? kase.assignedTo[0] : kase.assignedTo;

  // Documents for this case (with presigned download URLs)
  const { data: documents } = await supabase
    .from("Document")
    .select("*, uploadedBy:User!inner(name)")
    .eq("caseId", caseId)
    .order("createdAt", { ascending: false });

  const documentsWithUrls: DocumentItem[] = await Promise.all(
    (documents ?? []).map(async (doc: Record<string, unknown>) => {
      let downloadUrl: string | undefined;
      try {
        const { data: urlData } = await getPresignedDownloadUrl({
          bucket: StorageBuckets.CLIENT_DOCUMENTS,
          path: doc.storagePath as string,
          expiresIn: 300,
        });
        downloadUrl = urlData?.signedUrl;
      } catch {}

      const uploaderInfo = doc.uploadedBy as Record<string, string> | undefined;

      return {
        id: doc.id as string,
        name: doc.name as string,
        storagePath: doc.storagePath as string,
        mimeType: doc.mimeType as string,
        sizeBytes: doc.sizeBytes as number,
        category: doc.category as DocumentCategory,
        notes: doc.notes as string | null,
        createdAt:
          typeof doc.createdAt === "string"
            ? doc.createdAt
            : new Date(doc.createdAt as Date).toISOString(),
        caseTitle: kase.title,
        caseId: kase.id,
        uploadedByName: uploaderInfo?.name ?? "",
        applicantLabel: (doc.applicantLabel as string | null) ?? null,
        downloadUrl,
      };
    }),
  );

  // Tasks for this case
  const { data: tasks } = await supabase
    .from("Task")
    .select("id, title, description, dueDate, completedAt")
    .eq("caseId", caseId)
    .order("createdAt", { ascending: false });

  const initialTasks = (tasks ?? []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    title: t.title as string,
    description: (t.description as string | null) ?? null,
    dueDate:
      t.dueDate == null
        ? null
        : typeof t.dueDate === "string"
          ? t.dueDate
          : new Date(t.dueDate as Date).toISOString(),
    completedAt:
      t.completedAt == null
        ? null
        : typeof t.completedAt === "string"
          ? t.completedAt
          : new Date(t.completedAt as Date).toISOString(),
  }));

  // Recent activity for this case
  const { data: activity } = await supabase
    .from("ActivityLog")
    .select("id, action, entityType, userId, timestamp")
    .eq("organizationId", orgId)
    .eq("entityId", caseId)
    .order("timestamp", { ascending: false })
    .limit(8);

  const actorIds = [
    ...new Set(
      (activity ?? []).map((a: Record<string, unknown>) => a.userId as string).filter(Boolean),
    ),
  ];
  const { data: actors } = await supabase
    .from("User")
    .select("id, name")
    .in("id", actorIds.length > 0 ? actorIds : ["__none__"]);
  const actorNames = Object.fromEntries((actors ?? []).map((u: Record<string, unknown>) => [u.id as string, u.name as string]));

  const activityRows = (activity ?? []).map((a: Record<string, unknown>) => ({
    id: a.id as string,
    action: a.action as string,
    entityType: a.entityType as string,
    timestamp: fmtDate(a.timestamp),
    userName: actorNames[a.userId as string] ?? "system",
  }));

  const typeLabel =
    CASE_TYPE_LABELS[kase.caseType]?.replace(/\(.*\)/, "").trim() ?? String(kase.caseType);

  const keyDates: Array<{ label: string; value: unknown }> = [
    { label: "Created", value: kase.createdAt },
    { label: "Deadline", value: kase.deadlineDate },
    { label: "Submitted", value: kase.submissionDate },
    { label: "AOR", value: kase.aorDate },
    { label: "Decision", value: kase.decisionDate },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/cases"
            className="mb-1 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <ArrowLeft className="h-3 w-3" /> All cases
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{kase.title}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
            <Link href={`/clients/${kase.clientId}`} className="font-medium text-zinc-700 hover:underline dark:text-zinc-300">
              {client?.firstName} {client?.lastName}
            </Link>
            <span aria-hidden>·</span>
            <span>{typeLabel}</span>
            {assignedTo && (
              <>
                <span aria-hidden>·</span>
                <span>Assigned to {assignedTo.name}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CasePrioritySelect caseId={kase.id} priority={String(kase.priority)} />
          <CaseStatusSelect caseId={kase.id} status={String(kase.status)} />
        </div>
      </div>

      {/* Status strip + key facts */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Status</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", CASE_STATUS_STYLES[String(kase.status)] ?? CASE_STATUS_STYLES.INTAKE)}>
            {String(kase.status).replace(/_/g, " ")}
          </span>
          <div className="mt-3 space-y-1.5">
            {keyDates.map(({ label, value }) => (
              <p key={label} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-zinc-400">
                  <CalendarDays className="h-3 w-3" /> {label}
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">{fmtDate(value)}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Application</p>
          <div className="space-y-1.5">
            <p className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-zinc-400"><Hash className="h-3 w-3" /> IRCC #</span>
              <span className="text-zinc-600 dark:text-zinc-400">{kase.irccApplicationNumber || "—"}</span>
            </p>
            <p className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-zinc-400"><Hash className="h-3 w-3" /> UCI</span>
              <span className="text-zinc-600 dark:text-zinc-400">{kase.uciNumber || "—"}</span>
            </p>
            {kase.decisionResult && (
              <p className="flex items-center justify-between gap-2 text-xs">
                <span className="text-zinc-400">Result</span>
                <span className={cn(
                  "font-semibold",
                  kase.decisionResult === "APPROVED" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                )}>
                  {String(kase.decisionResult)}
                </span>
              </p>
            )}
          </div>
          {kase.description && (
            <p className="mt-3 border-t border-zinc-100 pt-2 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {kase.description}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
            <Briefcase className="h-3 w-3" /> Tasks
          </p>
          <CaseTasks caseId={kase.id} initialTasks={initialTasks} />
        </div>
      </div>

      {/* Documents */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Documents ({documentsWithUrls.length})
          </h2>
        </div>
        <DocumentList
          documents={documentsWithUrls}
          showCase={false}
          showUploader
          allowDelete
          onDelete={async (doc) => {
            "use server";
            const { deleteDocumentAction } = await import("@/lib/document-actions");
            return deleteDocumentAction(doc.id, orgId);
          }}
        />
      </section>

      {/* Activity */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <History className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Recent activity</h2>
        </div>
        {activityRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700">
            No logged activity yet
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white text-xs dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {activityRows.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-2">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{a.action.replace(/_/g, " ")}</span>
                <span className="text-zinc-400">
                  {a.entityType} · {a.userName || "system"} · {a.timestamp}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
