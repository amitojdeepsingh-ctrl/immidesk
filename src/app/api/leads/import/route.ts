import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// POST /api/leads/import — upload xlsx from browser
export async function POST(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });

    // Try Reddit sheet first, fall back to All_Leads
    const sheetName = wb.SheetNames.find(n => n === "Reddit") ?? wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);

    const leads = rows
      .filter(r => r["URL"] || r["url"])
      .map(r => ({
        organizationId: organization.id,
        platform:       String(r["Platform"] ?? r["platform"] ?? "Reddit"),
        source:         String(r["Source"] ?? r["source"] ?? ""),
        author:         String(r["Author"] ?? r["author"] ?? ""),
        title:          String(r["Title"] ?? r["title"] ?? ""),
        bodySnippet:    String(r["Body Snippet"] ?? r["bodySnippet"] ?? "").replace(/<[^>]+>/g, "").slice(0, 500),
        url:            String(r["URL"] ?? r["url"]),
        score:          Number(r["Score"] ?? r["score"] ?? 0),
        intentKeywords: String(r["Intent Keywords"] ?? r["intentKeywords"] ?? ""),
        shortPitch:     String(r["Short Pitch"] ?? r["shortPitch"] ?? ""),
        longPitch:      String(r["Long Pitch"] ?? r["longPitch"] ?? ""),
        status:         "pending",
      }));

    const { data, error } = await supabase
      .from("Lead")
      .upsert(leads, { onConflict: "url", ignoreDuplicates: true })
      .select("id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ inserted: data?.length ?? 0, total: leads.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
