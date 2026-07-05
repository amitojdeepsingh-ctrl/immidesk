// ═══════════════════════════════════════════════════════════════════════════
// ImmigDesk — Client Portal Upload Page
// ═══════════════════════════════════════════════════════════════════════════
// Route: /upload/[token]
// Public page (no auth required). Clients visit this page via a secure
// tokenized link to upload documents for their case.
// ═══════════════════════════════════════════════════════════════════════════

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { FileText, Shield, Upload, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientPortalUploadForm } from "./client-portal-upload-form";

// ─── Token verification (same logic as the API route) ──────────────────────

import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_SECRET =
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "fallback-dev-secret";

interface PortalToken {
  clientId: string;
  caseId: string;
  organizationId: string;
  expiresAt: number;
}

function verifyToken(token: string): PortalToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;

    const expectedSig = createHmac("sha256", TOKEN_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    const sigBuffer = Buffer.from(signature, "base64url");
    const expectedBuffer = Buffer.from(expectedSig, "base64url");

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    const payload: PortalToken = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8"),
    );

    if (Date.now() > payload.expiresAt * 1000) return null;
    if (!payload.clientId || !payload.caseId || !payload.organizationId) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ─── Page Props ────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ token: string }>;
}

// ─── Server Component ──────────────────────────────────────────────────────

export default async function ClientPortalUploadPage({ params }: PageProps) {
  const { token } = await params;

  // Verify token
  const portalToken = verifyToken(token);
  if (!portalToken) {
    return <InvalidTokenView />;
  }

  // Fetch case + client info for display
  const supabase = getSupabaseAdmin();
  const { data: caseRecord } = await supabase
    .from("Case")
    .select("id, title, caseType, organizationId, clientId, client:Client!inner(firstName, lastName), organization:Organization!inner(name)")
    .eq("id", portalToken.caseId)
    .single();

  if (
    !caseRecord ||
    caseRecord.organizationId !== portalToken.organizationId ||
    caseRecord.clientId !== portalToken.clientId
  ) {
    return <InvalidTokenView />;
  }

  const client = Array.isArray(caseRecord.client) ? caseRecord.client[0] : caseRecord.client;
  const org = Array.isArray(caseRecord.organization) ? caseRecord.organization[0] : caseRecord.organization;
  const clientName = `${client.firstName} ${client.lastName}`;
  const orgName = org.name;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-50">
            <Upload className="h-6 w-6 text-white dark:text-zinc-900" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Upload Documents
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {orgName} · {caseRecord.title}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
            For: {clientName}
          </p>
        </div>

        {/* Info card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                This is a secure upload page for your immigration case. Files
                you upload here will be attached directly to your case and
                visible to your representative.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Accepted formats: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX, TXT,
                CSV, ZIP. Max 25 MB per file.
              </p>
            </div>
          </div>
        </div>

        {/* Upload form (client component) */}
        <ClientPortalUploadForm token={token} />
      </div>
    </div>
  );
}

// ─── Invalid/Expired Token View ────────────────────────────────────────────

function InvalidTokenView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          <FileText className="h-6 w-6 text-red-500 dark:text-red-400" />
        </div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Link Expired or Invalid
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          This upload link is no longer valid. It may have expired or already
          been used. Please contact your representative for a new upload link.
        </p>
      </div>
    </div>
  );
}
