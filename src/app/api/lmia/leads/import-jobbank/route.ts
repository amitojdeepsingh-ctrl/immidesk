import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Search Reddit for Canadian employers posting about hiring foreign workers / LMIA
// Reddit's public JSON API works without auth and is accessible from Vercel
const REDDIT_SUBREDDITS = [
  "r/canada",
  "r/canadaimmigration",
  "r/legaladvicecanada",
  "r/farming",
  "r/agriculture",
  "r/canadabusiness",
];

const LMIA_KEYWORDS = [
  "LMIA employer",
  "hire foreign workers Canada",
  "temporary foreign worker program",
  "farm worker Canada hiring",
  "TFWP employer",
];

interface RedditPost {
  title: string;
  selftext: string;
  author: string;
  url: string;
  subreddit: string;
  created_utc: number;
}

async function searchReddit(query: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&restrict_sr=false&sort=new&limit=25&t=month`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ADS-Immigration-Leads/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data?.children ?? []).map((c: { data: RedditPost }) => c.data);
  } catch {
    return [];
  }
}

// Extract potential company/employer name from post title or body
function extractCompanyName(post: RedditPost): string | null {
  const text = `${post.title} ${post.selftext}`.slice(0, 500);

  // Patterns: "I work at X", "my company X", "employer X", "we are X hiring"
  const patterns = [
    /(?:company|employer|business|farm|restaurant|hotel)\s+(?:called|named|is)\s+"?([A-Z][A-Za-z0-9\s&'.-]{2,40})"?/i,
    /"([A-Z][A-Za-z0-9\s&'.-]{3,40})"\s+(?:is hiring|needs workers|looking for)/i,
    /([A-Z][A-Za-z0-9\s&'.-]{3,40})\s+(?:Ltd|Inc|Corp|Co\.|Limited|Farms|Restaurant|Hotel|Services)/i,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractIndustry(post: RedditPost): string {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  if (/farm|agricult|greenhouse|harvest|crop/i.test(text)) return "Agriculture";
  if (/restaurant|hotel|hospitality|resort|motel/i.test(text)) return "Hospitality";
  if (/construct|contractor|building|trades/i.test(text)) return "Construction";
  if (/truck|transport|freight|logistics/i.test(text)) return "Transport";
  if (/food processing|meat|packing|manufact/i.test(text)) return "Food Processing";
  return "General";
}

export async function POST(req: Request) {
  const { organization } = await requireAuth();
  const body = await req.json();
  const db = getSupabaseAdmin();

  // Fetch existing to dedupe
  const { data: existing } = await db
    .from("LmiaLead")
    .select("companyName")
    .eq("organizationId", organization.id);
  const existingNames = new Set(
    (existing ?? []).map((e: { companyName: string }) => e.companyName.toLowerCase().trim()),
  );

  const toInsert: object[] = [];
  const seenKeys = new Set<string>();

  // Search Reddit for LMIA-related employer posts
  const queries = body.province
    ? [`LMIA employer ${body.province}`, `hire foreign worker ${body.province}`, `TFWP ${body.province}`]
    : LMIA_KEYWORDS.slice(0, 3);

  const allPosts: RedditPost[] = [];
  for (const q of queries) {
    const posts = await searchReddit(q);
    allPosts.push(...posts);
  }

  // Dedupe posts and extract lead info
  const seenPostUrls = new Set<string>();
  for (const post of allPosts) {
    if (seenPostUrls.has(post.url)) continue;
    seenPostUrls.add(post.url);

    const companyName = extractCompanyName(post);
    const displayName = companyName || `Reddit Lead — ${post.subreddit} (${new Date(post.created_utc * 1000).toLocaleDateString("en-CA")})`;
    const key = displayName.toLowerCase().trim();

    if (existingNames.has(key) || seenKeys.has(key)) continue;
    seenKeys.add(key);

    toInsert.push({
      organizationId: organization.id,
      companyName: displayName,
      contactName: post.author !== "[deleted]" ? `u/${post.author}` : null,
      email: null,
      phone: null,
      industry: extractIndustry(post),
      province: body.province || null,
      jobTitle: null,
      nocCode: null,
      source: "REDDIT",
      sourceUrl: `https://reddit.com${post.url}`,
      status: "NEW",
      notes: post.title.slice(0, 200),
    });

    if (toInsert.length >= 20) break;
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      imported: 0,
      message: "No new leads found on Reddit right now. Try again later or use the Python script for bulk Yellow Pages imports.",
    });
  }

  const { error } = await db.from("LmiaLead").insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ imported: toInsert.length });
}
