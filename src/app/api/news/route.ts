import { requireAuth } from "@/lib/auth";
import { getNewsItems, markItemsRead } from "@/lib/scraper/news";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const category = req.nextUrl.searchParams.get("category") ?? "";
    const items = await getNewsItems(category || undefined);
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth();
    const { ids } = await req.json();
    await markItemsRead(ids);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
