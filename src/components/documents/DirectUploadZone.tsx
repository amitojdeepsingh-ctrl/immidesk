"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UploadZone, type CaseOption } from "./UploadZone";
import type { DocumentCategory as DocCatType } from "@/types";

interface DirectUploadZoneProps {
  cases: CaseOption[];
}

/**
 * UploadZone with a browser-to-storage upload path.
 *
 * Files go straight to Supabase Storage through a signed URL and are then
 * registered server-side. Server Actions carry a 1 MB body limit, which broke
 * any real scan or merged PDF.
 */
export function DirectUploadZone({ cases }: DirectUploadZoneProps) {
  const router = useRouter();

  async function uploadFile(file: File, category: DocCatType, caseId: string, notes: string): Promise<string> {
    const signRes = await fetch("/api/documents/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        caseId,
        fileName: file.name,
        sizeBytes: file.size,
        category,
      }),
    });
    const signJson = await signRes.json();
    if (!signRes.ok) throw new Error(signJson.error?.message ?? "Could not prepare the upload");

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(signJson.data.bucket)
      .uploadToSignedUrl(signJson.data.path, signJson.data.token, file, {
        contentType: file.type || "application/octet-stream",
      });
    if (uploadError) throw new Error(uploadError.message);

    const regRes = await fetch("/api/documents/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        caseId,
        path: signJson.data.path,
        fileName: signJson.data.fileName,
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        category,
        notes: notes?.trim() ? notes.trim() : null,
      }),
    });
    const regJson = await regRes.json();
    if (!regRes.ok) throw new Error(regJson.error?.message ?? "Could not save the document");

    router.refresh();
    return regJson.data.id as string;
  }

  return (
    <UploadZone
      cases={cases}
      onUpload={uploadFile}
      onComplete={() => router.refresh()}
    />
  );
}
