import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { uploadFileAdmin, StorageBuckets, getPublicUrl } from "@/lib/storage";
import { sanitizeFileName, getExtensionFromMimeType } from "@/lib/document-naming";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX = 2 * 1024 * 1024;

/** Upload a firm logo → public URL saved on Organization.logoUrl. */
export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    if (!["OWNER", "ADMIN"].includes(prismaUser.role)) {
      return NextResponse.json({ error: "Only organization owners can update the logo" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX) {
      return NextResponse.json({ error: "Logo must be between 1 byte and 2 MB" }, { status: 400 });
    }
    if (file.type && !ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Use PNG, JPG, WEBP or SVG" }, { status: 415 });
    }

    const safe = sanitizeFileName(file.name || "logo.png");
    const ext = getExtensionFromMimeType(file.type || "image/png");
    const fileName = safe.endsWith(ext) ? safe : safe + ext;
    const path = `${organization.id}/logo/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await uploadFileAdmin({
      bucket: StorageBuckets.ORGANIZATION_LOGOS,
      path,
      file: buffer,
      contentType: file.type || "image/png",
      upsert: true,
    });
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    const publicUrl = getPublicUrl(StorageBuckets.ORGANIZATION_LOGOS, path);
    const db = getSupabaseAdmin();
    const { error: updateErr } = await db
      .from("Organization")
      .update({ logoUrl: publicUrl, updatedAt: new Date().toISOString() })
      .eq("id", organization.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ data: { logoUrl: publicUrl } }, { status: 201 });
  } catch (err) {
    console.error("logo upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
