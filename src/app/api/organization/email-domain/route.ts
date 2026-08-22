import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

/**
 * Per-firm email sending domains.
 * POST   { domain: "yourfirm.com" }  → registers the domain in Resend and
 *                                      returns the DNS records to add.
 * GET    → checks current verification status with Resend and persists it.
 * Once status === "verified", client emails are sent FROM this firm's domain
 * instead of the platform sender.
 */

function getSettings(org: Record<string, unknown>): Record<string, unknown> {
  return (org.settings as Record<string, unknown> | null) ?? {};
}

function getSendingDomain(settings: Record<string, unknown>): Record<string, unknown> | null {
  return (settings.sendingDomain as Record<string, unknown> | null) ?? null;
}

export async function GET() {
  try {
    const { organization } = await requireAuth();
    const apiKey = process.env["RESEND_API_KEY"];
    const sd = getSendingDomain(getSettings(organization as Record<string, unknown>));
    if (!sd) return NextResponse.json({ data: null });

    if (!apiKey) {
      return NextResponse.json({ data: { ...sd, status: "unavailable", note: "Email service not configured" } });
    }

    const resend = new Resend(apiKey);
    const { data: domain } = await resend.domains.get(sd.resendDomainId as string);
    const status = domain?.status ?? "unknown";

    if (status !== sd.status) {
      const db = getSupabaseAdmin();
      const settings = getSettings(organization as Record<string, unknown>);
      await db
        .from("Organization")
        .update({
          settings: { ...settings, sendingDomain: { ...sd, status, checkedAt: new Date().toISOString() } },
          updatedAt: new Date().toISOString(),
        })
        .eq("id", organization.id);
    }

    return NextResponse.json({ data: { ...sd, status } });
  } catch (err) {
    console.error("email-domain GET error:", err);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    if (!["OWNER", "ADMIN"].includes(prismaUser.role)) {
      return NextResponse.json({ error: "Only organization owners can configure email domains" }, { status: 403 });
    }

    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) {
      return NextResponse.json({ error: "Email service is not configured on the platform" }, { status: 501 });
    }

    const { domain: rawDomain } = z.object({ domain: z.string().min(4).max(253) }).parse(await req.json());
    const domain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      return NextResponse.json({ error: "Enter a valid domain like yourfirm.com" }, { status: 422 });
    }

    const resend = new Resend(apiKey);
    const { data: created, error } = await resend.domains.create({ name: domain });
    if (error || !created) {
      return NextResponse.json({ error: error?.message ?? "Resend rejected this domain" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: freshOrg } = await db.from("Organization").select("settings").eq("id", organization.id).single();
    const settings = (freshOrg?.settings as Record<string, unknown> | null) ?? {};
    const sendingDomain = {
      domain,
      resendDomainId: created.id,
      status: created.status ?? "pending",
      records: (created as unknown as { records?: unknown }).records ?? [],
      createdAt: new Date().toISOString(),
    };
    await db
      .from("Organization")
      .update({ settings: { ...settings, sendingDomain }, updatedAt: new Date().toISOString() })
      .eq("id", organization.id);

    return NextResponse.json({ data: sendingDomain }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 422 });
    }
    console.error("email-domain POST error:", err);
    return NextResponse.json({ error: "Could not register domain" }, { status: 500 });
  }
}

export const runtime = "nodejs";
