import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { DocumentList } from "@/components/documents/DocumentList";
import { UploadZone } from "@/components/documents/UploadZone";
import { getPresignedDownloadUrl, StorageBuckets } from "@/lib/storage";
import type { DocumentItem } from "@/components/documents/DocumentList";
import type { CaseOption } from "@/components/documents/UploadZone";
import type { DocumentCategory } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientDocumentsPage({ params }: PageProps) {
  const { organization } = await requireAuth();
  const { id: clientId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: client } = await supabase
    .from("Client")
    .select("id, organizationId, firstName, lastName, email")
    .eq("id", clientId)
    .single();

  if (!client || client.organizationId !== organization.id) {
    notFound();
  }

  const { data: cases } = await supabase
    .from("Case")
    .select("id, title")
    .eq("clientId", clientId)
    .eq("organizationId", organization.id)
    .order("createdAt", { ascending: false });

  const { data: documents } = await supabase
    .from("Document")
    .select("*, case:Case!inner(id, title), uploadedBy:User!inner(name)")
    .eq("clientId", clientId)
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

      const caseInfo = doc.case as Record<string, string> | undefined;
      const uploaderInfo = doc.uploadedBy as Record<string, string> | undefined;

      return {
        id: doc.id as string,
        name: doc.name as string,
        storagePath: doc.storagePath as string,
        mimeType: doc.mimeType as string,
        sizeBytes: doc.sizeBytes as number,
        category: doc.category as DocumentCategory,
        notes: doc.notes as string | null,
        createdAt: typeof doc.createdAt === "string" ? doc.createdAt : new Date(doc.createdAt as Date).toISOString(),
        caseTitle: caseInfo?.title ?? "",
        caseId: caseInfo?.id ?? "",
        uploadedByName: uploaderInfo?.name ?? "",
        downloadUrl,
      };
    }),
  );

  const caseOptions: CaseOption[] = (cases ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    title: c.title as string,
  }));

  const clientName = `${client.firstName} ${client.lastName}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Documents</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {documents?.length ?? 0} document{(documents?.length ?? 0) !== 1 ? "s" : ""} across {cases?.length ?? 0} case{(cases?.length ?? 0) !== 1 ? "s" : ""}
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Upload className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Upload New Documents
          </h2>
        </div>
        {!cases || cases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center dark:border-zinc-700">
            <FileText className="mx-auto mb-2 h-6 w-6 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No cases exist for this client yet.
            </p>
            <Link
              href={`/clients/${clientId}`}
              className="mt-2 inline-block text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              Create a case first &rarr;
            </Link>
          </div>
        ) : (
          <UploadZone
            cases={caseOptions}
            onUpload={async (file, category, caseId, notes) => {
              "use server";
              const { uploadDocumentAction } = await import("@/lib/document-actions");
              return uploadDocumentAction(file, category, caseId, notes, organization.id);
            }}
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            All Documents
          </h2>
        </div>
        <DocumentList
          documents={documentsWithUrls}
          showCase={true}
          showUploader={true}
          allowDelete={true}
          onDelete={async (doc) => {
            "use server";
            const { deleteDocumentAction } = await import("@/lib/document-actions");
            return deleteDocumentAction(doc.id, organization.id);
          }}
        />
      </section>
    </div>
  );
}
