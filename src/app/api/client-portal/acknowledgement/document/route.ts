// ═══════════════════════════════════════════════════════════════════════════
// GET /api/client-portal/acknowledgement/document?token=…
// ═══════════════════════════════════════════════════════════════════════════
// Streams the document set the client is being asked to confirm, behind the
// acknowledgement token. The storage path never appears in the page, and the
// redirect target is a short-lived signed URL.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAcknowledgementToken } from "@/lib/portal-token";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const payload = verifyAcknowledgementToken(token ?? "");
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data: ack } = await db
    .from("DocumentAcknowledgement")
    .select("id, unsignedDocumentId, signedDocumentId, sourceDocumentId")
    .eq("id", payload.acknowledgementId)
    .eq("organizationId", payload.organizationId)
    .maybeSingle();

  if (!ack) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const documentId = ack.signedDocumentId ?? ack.unsignedDocumentId ?? ack.sourceDocumentId;
  if (!documentId) return NextResponse.json({ error: "No document attached" }, { status: 404 });

  const { data: doc } = await db
    .from("Document")
    .select("storagePath, name")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc?.storagePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: signed, error } = await db.storage
    .from("client-documents")
    .createSignedUrl(doc.storagePath as string, 900);
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not open the document" }, { status: 500 });
  }

  const response = NextResponse.redirect(signed.signedUrl, { status: 302 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
