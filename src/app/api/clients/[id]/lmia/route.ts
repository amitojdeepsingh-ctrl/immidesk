import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organization } = await requireAuth();
    const { id: clientId } = await params;
    const db = getSupabaseAdmin();

    const [{ data: ads }, { data: applicants }] = await Promise.all([
      db.from("LmiaAd")
        .select("*")
        .eq("clientId", clientId)
        .eq("organizationId", organization.id)
        .order("datePosted", { ascending: false }),
      db.from("LmiaApplicant")
        .select("*")
        .eq("clientId", clientId)
        .eq("organizationId", organization.id)
        .order("contactDate", { ascending: false }),
    ]);

    return NextResponse.json({ ads: ads ?? [], applicants: applicants ?? [] });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organization } = await requireAuth();
    const { id: clientId } = await params;
    const body = await req.json();
    const db = getSupabaseAdmin();

    if (body.type === "applicant") {
      const { name, contactDate, isCanadian, reasonNotHired, notes } = body;
      if (!name || !contactDate) return NextResponse.json({ error: "name and contactDate required" }, { status: 400 });
      const { data, error } = await db.from("LmiaApplicant").insert({
        organizationId: organization.id,
        clientId,
        name,
        contactDate,
        isCanadian: !!isCanadian,
        reasonNotHired: reasonNotHired ?? null,
        notes: notes ?? null,
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ applicant: data });
    }

    // Default: advertisement
    const { platform, url, jobTitle, wage, datePosted, dateEnded, notes } = body;
    if (!platform || !datePosted) return NextResponse.json({ error: "platform and datePosted required" }, { status: 400 });
    const { data, error } = await db.from("LmiaAd").insert({
      organizationId: organization.id,
      clientId,
      platform,
      url: url ?? null,
      jobTitle: jobTitle ?? null,
      wage: wage ?? null,
      datePosted,
      dateEnded: dateEnded ?? null,
      notes: notes ?? null,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ ad: data });
  } catch (err) {
    console.error("lmia POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
