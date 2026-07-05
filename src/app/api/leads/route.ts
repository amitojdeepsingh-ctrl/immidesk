import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/leads — list leads for org
export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const status = req.nextUrl.searchParams.get("status") ?? "pending";

    const { data, error } = await supabase
      .from("Lead")
      .select("*")
      .eq("organizationId", organization.id)
      .eq("status", status)
      .order("score", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST /api/leads — scraper pushes leads here (or xlsx import)
export async function POST(req: NextRequest) {
  try {
    // ponytail: simple API key auth for scraper, swap for OAuth if needed
    const apiKey = req.headers.get("x-api-key");
    const supabase = getSupabaseAdmin();

    let orgId: string;

    if (apiKey === process.env.SCRAPER_API_KEY) {
      // Called by scraper — use env var org id
      orgId = process.env.SCRAPER_ORG_ID!;
    } else {
      const { organization } = await requireAuth();
      orgId = organization.id;
    }

    const body = await req.json();
    const leads = Array.isArray(body) ? body : [body];

    const rows = leads.map((l: Record<string, unknown>) => ({
      organizationId: orgId,
      platform:       l.platform ?? "Reddit",
      source:         l.source ?? null,
      author:         l.author,
      title:          l.title ?? null,
      bodySnippet:    l.bodySnippet ?? null,
      url:            l.url,
      score:          l.score ?? 0,
      intentKeywords: l.intentKeywords ?? null,
      shortPitch:     l.shortPitch ?? null,
      longPitch:      l.longPitch ?? null,
      status:         "pending",
    }));

    const { data, error } = await supabase
      .from("Lead")
      .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
      .select("id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ inserted: data?.length ?? 0 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
