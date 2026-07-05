// News scraper: stores results in Supabase Storage (JSON) — no SQL table needed.
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "immigdesk-data";
const NEWS_FILE = "news/items.json";

export interface StoredNewsItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  category: string;
  drawNumber: number | null;
  crsScore: number | null;
  invitations: number | null;
  drawDate: string | null;
  isNew: boolean;
  publishedAt: string;
}

// ── Bucket / file helpers ──────────────────────────────────────────────────────
async function ensureBucket(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: false });
  }
}

async function readItems(): Promise<StoredNewsItem[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.storage.from(BUCKET).download(NEWS_FILE);
  if (!data) return [];
  try {
    const text = await data.text();
    return JSON.parse(text) as StoredNewsItem[];
  } catch {
    return [];
  }
}

async function writeItems(items: StoredNewsItem[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  const blob = new Blob([JSON.stringify(items)], { type: "application/json" });
  // upload accepts File | Blob in Node too via Buffer conversion
  const buf = Buffer.from(await blob.arrayBuffer());
  await supabase.storage.from(BUCKET).upload(NEWS_FILE, buf, {
    contentType: "application/json",
    upsert: true,
  });
}

export async function getNewsItems(category?: string): Promise<StoredNewsItem[]> {
  const items = await readItems();
  if (!category) return items;
  return items.filter(i => i.category === category);
}

export async function markItemsRead(ids: string[]): Promise<void> {
  const items = await readItems();
  const idSet = new Set(ids);
  const updated = items.map(i => idSet.has(i.id) ? { ...i, isNew: false } : i);
  await writeItems(updated);
}

// ── Scrapers ─────────────────────────────────────────────────────────────────
async function scrapeExpressEntry(): Promise<Omit<StoredNewsItem, "id" | "isNew" | "publishedAt">[]> {
  try {
    const res = await fetch(
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html",
      { next: { revalidate: 0 } }
    );
    const html = await res.text();
    const items: Omit<StoredNewsItem, "id" | "isNew" | "publishedAt">[] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;|&#160;/g, " ").trim();

    let rowMatch; let isFirst = true;
    while ((rowMatch = rowRegex.exec(html)) !== null) {
      if (isFirst) { isFirst = false; continue; }
      const cells: string[] = [];
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cm;
      while ((cm = cellRe.exec(rowMatch[1])) !== null) cells.push(strip(cm[1]));
      if (cells.length < 4) continue;
      const drawNum = parseInt(cells[0]);
      if (isNaN(drawNum)) continue;
      const crs = parseInt(cells[2]?.replace(/,/g, "") ?? "");
      const inv = parseInt(cells[3]?.replace(/,/g, "") ?? "");
      const rawDate = cells[1];
      let drawDate: string | null = null;
      try { drawDate = new Date(rawDate).toISOString(); } catch { drawDate = null; }
      items.push({
        title: `Express Entry Draw #${drawNum} — CRS ${crs || "N/A"} (${rawDate})`,
        summary: `${inv || "?"} invitations issued. Minimum CRS score: ${crs || "N/A"}.`,
        url: `https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html#${drawNum}`,
        source: "canada.ca",
        category: "EXPRESS_ENTRY",
        drawNumber: isNaN(drawNum) ? null : drawNum,
        crsScore: isNaN(crs) ? null : crs,
        invitations: isNaN(inv) ? null : inv,
        drawDate,
      });
      if (items.length >= 5) break;
    }
    return items;
  } catch (e) { console.error("EE scrape failed:", e); return []; }
}

async function scrapeCICNews(): Promise<Omit<StoredNewsItem, "id" | "isNew" | "publishedAt">[]> {
  try {
    const res = await fetch("https://www.cicnews.com/feed", { next: { revalidate: 0 } });
    const xml = await res.text();
    const items: Omit<StoredNewsItem, "id" | "isNew" | "publishedAt">[] = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/gi;
    const getTag = (s: string, t: string) => {
      const m = new RegExp(`<${t}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${t}>|<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, "i").exec(s);
      return (m?.[1] ?? m?.[2] ?? "").trim();
    };
    let m;
    while ((m = itemRe.exec(xml)) !== null) {
      const title = getTag(m[1], "title");
      const link = getTag(m[1], "link");
      const desc = getTag(m[1], "description").replace(/<[^>]+>/g, "").slice(0, 300);
      if (!title || !link) continue;
      const tl = title.toLowerCase();
      const category = tl.includes("express entry") || tl.includes("crs") ? "EXPRESS_ENTRY"
        : tl.includes("pnp") || tl.includes("provincial") ? "PNP" : "NEWS";
      items.push({ title, summary: desc || null, url: link, source: "cicnews.com", category, drawNumber: null, crsScore: null, invitations: null, drawDate: null });
      if (items.length >= 10) break;
    }
    return items;
  } catch (e) { console.error("CICNews failed:", e); return []; }
}

async function scrapeCanadaVisa(): Promise<Omit<StoredNewsItem, "id" | "isNew" | "publishedAt">[]> {
  try {
    const res = await fetch("https://www.canadavisa.com/canada-immigration-news.html", { next: { revalidate: 0 } });
    const html = await res.text();
    const items: Omit<StoredNewsItem, "id" | "isNew" | "publishedAt">[] = [];
    const artRe = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();
    let m;
    while ((m = artRe.exec(html)) !== null) {
      const tm = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/i.exec(m[1]);
      const hm = /href="([^"]+)"/i.exec(m[1]);
      if (!tm || !hm) continue;
      const title = strip(tm[1]);
      const href = hm[1].startsWith("http") ? hm[1] : `https://www.canadavisa.com${hm[1]}`;
      const tl = title.toLowerCase();
      const category = tl.includes("express entry") || tl.includes("crs") ? "EXPRESS_ENTRY"
        : tl.includes("pnp") || tl.includes("provincial") ? "PNP" : "NEWS";
      items.push({ title, summary: null, url: href, source: "canadavisa.com", category, drawNumber: null, crsScore: null, invitations: null, drawDate: null });
      if (items.length >= 10) break;
    }
    return items;
  } catch (e) { console.error("CanadaVisa failed:", e); return []; }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function scrapeAndSave(): Promise<{ inserted: number; total: number }> {
  await ensureBucket();

  const [ee, cic, cv] = await Promise.all([scrapeExpressEntry(), scrapeCICNews(), scrapeCanadaVisa()]);
  const scraped = [...ee, ...cic, ...cv];

  if (scraped.length === 0) return { inserted: 0, total: 0 };

  const existing = await readItems();
  const existingUrls = new Set(existing.map(i => i.url));
  const newScraped = scraped.filter(i => !existingUrls.has(i.url));

  if (newScraped.length === 0) return { inserted: 0, total: scraped.length };

  const now = new Date().toISOString();
  const newItems: StoredNewsItem[] = newScraped.map(i => ({
    ...i,
    id: crypto.randomUUID(),
    isNew: true,
    publishedAt: now,
  }));

  // Prepend new items, keep latest 200
  const merged = [...newItems, ...existing].slice(0, 200);
  await writeItems(merged);

  return { inserted: newItems.length, total: scraped.length };
}
