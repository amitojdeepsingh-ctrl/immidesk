"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Send, ExternalLink, Newspaper, TrendingUp, GitBranch, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsItem {
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

const CATEGORY_TABS = [
  { key: "", label: "All", icon: Newspaper },
  { key: "EXPRESS_ENTRY", label: "Express Entry", icon: TrendingUp },
  { key: "PNP", label: "PNP", icon: GitBranch },
  { key: "NEWS", label: "News", icon: Sparkles },
];

const CATEGORY_NEWSLETTER_TYPE: Record<string, string> = {
  EXPRESS_ENTRY: "EXPRESS_ENTRY",
  PNP: "PNP",
  NEWS: "ALL",
};

const SOURCE_COLORS: Record<string, string> = {
  "canada.ca":     "bg-red-100 text-red-700",
  "cicnews.com":   "bg-blue-100 text-blue-700",
  "canadavisa.com":"bg-green-100 text-green-700",
};

export default function DrawsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load(cat = category) {
    setLoading(true);
    const res = await fetch(`/api/news${cat ? `?category=${cat}` : ""}`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [category]); // eslint-disable-line

  async function runScraper() {
    setScraping(true);
    setMsg(null);
    const res = await fetch("/api/cron/news", { method: "POST" });
    const json = await res.json();
    setMsg(res.ok ? `✅ Found ${json.total} items, ${json.inserted} new` : `❌ ${json.error}`);
    setScraping(false);
    if (res.ok) load();
  }

  function sendToNewsletter(item: NewsItem) {
    const caseType = CATEGORY_NEWSLETTER_TYPE[item.category] ?? "ALL";
    const subject = encodeURIComponent(item.title);
    const body = encodeURIComponent(
      item.category === "EXPRESS_ENTRY" && item.crsScore
        ? `A new Express Entry draw has taken place!\n\nDraw #${item.drawNumber}\nMinimum CRS Score: ${item.crsScore}\nInvitations Issued: ${item.invitations?.toLocaleString()}\n\nFor more details: ${item.url}\n\nIf you have questions about your eligibility, please contact us.`
        : `${item.title}\n\n${item.summary ?? ""}\n\nRead more: ${item.url}\n\nContact us if you have any questions about how this affects your application.`
    );
    router.push(`/newsletter?subject=${subject}&body=${body}&caseType=${caseType}`);
  }

  const newCount = items.filter(i => i.isNew).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Immigration News & Draws
            {newCount > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{newCount} NEW</span>
            )}
          </h1>
          <p className="text-sm text-zinc-500">Express Entry draws, PNP updates, and immigration news — auto-updated daily</p>
        </div>
        <button onClick={runScraper} disabled={scraping}
          className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
          <RefreshCw className={cn("h-3.5 w-3.5", scraping && "animate-spin")} />
          {scraping ? "Checking…" : "Check for Updates"}
        </button>
      </div>

      {msg && <p className="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>}

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {CATEGORY_TABS.map(t => (
          <button key={t.key} onClick={() => setCategory(t.key)}
            className={cn("flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              category === t.key
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400")}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <Newspaper className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-500">No news yet. Click &ldquo;Check for Updates&rdquo; to fetch the latest.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className={cn(
              "rounded-lg border bg-white p-4 dark:bg-zinc-900",
              item.isNew ? "border-blue-200 dark:border-blue-900/50" : "border-zinc-200 dark:border-zinc-800"
            )}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {item.isNew && <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", SOURCE_COLORS[item.source] ?? "bg-zinc-100 text-zinc-600")}>
                      {item.source}
                    </span>
                    <span className="text-[10px] text-zinc-400">{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>

                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{item.title}</p>

                  {item.category === "EXPRESS_ENTRY" && item.crsScore && (
                    <div className="mt-2 flex flex-wrap gap-4">
                      <span className="text-xs text-zinc-500">CRS: <strong className="text-zinc-900 dark:text-zinc-50">{item.crsScore}</strong></span>
                      {item.invitations && <span className="text-xs text-zinc-500">Invitations: <strong className="text-zinc-900 dark:text-zinc-50">{item.invitations.toLocaleString()}</strong></span>}
                      {item.drawNumber && <span className="text-xs text-zinc-500">Draw: <strong className="text-zinc-900 dark:text-zinc-50">#{item.drawNumber}</strong></span>}
                    </div>
                  )}

                  {item.summary && !item.crsScore && (
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{item.summary}</p>
                  )}
                </div>
                <a href={item.url} target="_blank" rel="noreferrer"
                  className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  {item.category === "EXPRESS_ENTRY" ? "Express Entry" : item.category === "PNP" ? "Provincial Nominee" : "General News"}
                </span>
                <button onClick={() => sendToNewsletter(item)}
                  className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  <Send className="h-3 w-3" /> Send to Clients
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
