import { NextRequest, NextResponse } from "next/server";
import { scrapeAndSave } from "@/lib/scraper/news";

// Vercel cron: daily at 9 AM — see vercel.json
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await scrapeAndSave();
  return NextResponse.json(result);
}

// Manual trigger from dashboard
export async function POST(req: NextRequest) {
  try {
    const { organization } = await (await import("@/lib/auth")).requireAuth();
    if (!organization) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const result = await scrapeAndSave();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
