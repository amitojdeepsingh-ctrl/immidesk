import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organization } = await requireAuth();
    const { id: clientId } = await params;
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("caseId");

    const db = getSupabaseAdmin();
    let query = db.from("PortalMessage")
      .select("*")
      .eq("clientId", clientId)
      .eq("organizationId", organization.id)
      .order("createdAt", { ascending: true });

    if (caseId) query = query.eq("caseId", caseId);

    const { data: messages, error } = await query;
    if (error) throw error;

    return NextResponse.json({ messages: messages ?? [] });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organization, prismaUser } = await requireAuth();
    const { id: clientId } = await params;
    const { caseId, content } = await req.json();
    if (!caseId || !content?.trim()) {
      return NextResponse.json({ error: "caseId and content required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: message, error } = await db.from("PortalMessage").insert({
      organizationId: organization.id,
      caseId,
      clientId,
      content: content.trim(),
      sentByClient: false,
      senderName: prismaUser.name,
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ message });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
