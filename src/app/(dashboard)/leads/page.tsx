"use client";

import { useState, useEffect, useRef } from "react";
import { ExternalLink, Check, X, Upload, RefreshCw, MessageSquare, Clock, Users, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  platform: string;
  source: string;
  author: string;
  title: string;
  bodySnippet: string;
  url: string;
  score: number;
  intentKeywords: string;
  shortPitch: string;
  longPitch: string;
  status: string;
  contactedAt: string | null;
  createdAt: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  Reddit: "bg-orange-100 text-orange-700",
  Facebook: "bg-blue-100 text-blue-700",
  Quora: "bg-red-100 text-red-700",
  Twitter: "bg-sky-100 text-sky-700",
};

function redditDmUrl(author: string, pitch: string) {
  const username = author.replace("/u/", "").replace("u/", "");
  return `https://www.reddit.com/message/compose/?to=${encodeURIComponent(username)}&subject=${encodeURIComponent("Quick question about your immigration situation")}&message=${encodeURIComponent(pitch)}`;
}

function platformDmUrl(platform: string, author: string, pitch: string) {
  if (platform === "Reddit") return redditDmUrl(author, pitch);
  // ponytail: other platforms open profile page, DM is manual
  return author.startsWith("http") ? author : `https://www.${platform.toLowerCase()}.com`;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<"pending" | "contacted" | "skipped">("pending");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load(s = status) {
    setLoading(true);
    const res = await fetch(`/api/leads?status=${s}`);
    const data = await res.json();
    setLeads(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [status]); // eslint-disable-line

  async function updateStatus(id: string, newStatus: "contacted" | "skipped") {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLeads(l => l.filter(lead => lead.id !== id));
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/leads/import", { method: "POST", body: fd });
    const json = await res.json();
    setImportMsg(res.ok ? `✅ Imported ${json.inserted} new leads (${json.total} in file)` : `❌ ${json.error}`);
    setImporting(false);
    if (res.ok) load();
    e.target.value = "";
  }

  async function runScraper() {
    setScraping(true);
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_SCRAPER_WEBHOOK;
      if (!webhookUrl) {
        alert("No scraper webhook configured. Set NEXT_PUBLIC_SCRAPER_WEBHOOK in your env.");
        return;
      }
      await fetch(webhookUrl, { method: "POST" });
      alert("Scraper triggered! Leads will appear shortly.");
    } catch {
      alert("Failed to trigger scraper.");
    } finally {
      setScraping(false);
    }
  }

  const tabs: { key: typeof status; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "contacted", label: "Contacted" },
    { key: "skipped", label: "Skipped" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Lead Queue</h1>
          <p className="text-sm text-zinc-500">{leads.length} {status} leads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" /> {importing ? "Importing…" : "Import XLSX"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {importMsg && (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">{importMsg}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setStatus(t.key)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              status === t.key
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Lead cards */}
      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400">
          No {status} leads. Import an XLSX or run the scraper.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => {
            const isOpen = expanded === lead.id;
            const pitch = isOpen ? lead.longPitch : lead.shortPitch;
            const dmUrl = platformDmUrl(lead.platform, lead.author, lead.longPitch || lead.shortPitch || "");

            return (
              <div key={lead.id} className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                {/* Top row */}
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", PLATFORM_COLORS[lead.platform] ?? "bg-zinc-100 text-zinc-600")}>
                        {lead.platform}
                      </span>
                      {lead.source && <span className="text-[10px] text-zinc-400">{lead.source}</span>}
                      <span className="ml-auto text-[10px] font-semibold text-zinc-500">Score: {lead.score}</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2">{lead.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{lead.author}</p>
                    {lead.bodySnippet && (
                      <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2">{lead.bodySnippet}</p>
                    )}
                  </div>
                  <a href={lead.url} target="_blank" rel="noreferrer"
                    className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Pitch box */}
                <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      <MessageSquare className="inline h-3 w-3 mr-1" />
                      {isOpen ? "Long pitch" : "Short pitch"}
                    </span>
                    <button onClick={() => setExpanded(isOpen ? null : lead.id)}
                      className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600">
                      {isOpen ? <><ChevronUp className="h-3 w-3" />Short</> : <><ChevronDown className="h-3 w-3" />Long</>}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{pitch}</p>
                </div>

                {/* Actions */}
                {status === "pending" && (
                  <div className="flex gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                    <a
                      href={dmUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => updateStatus(lead.id, "contacted")}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-zinc-900 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {lead.platform === "Reddit" ? "Open Reddit DM" : `Open ${lead.platform} DM`}
                    </a>
                    <button
                      onClick={() => updateStatus(lead.id, "skipped")}
                      className="flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700"
                    >
                      <X className="h-3.5 w-3.5" /> Skip
                    </button>
                  </div>
                )}
                {status === "contacted" && (
                  <div className="flex items-center gap-2 border-t border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs text-zinc-500">
                      Contacted {lead.contactedAt ? new Date(lead.contactedAt).toLocaleDateString() : ""}
                    </span>
                    <a href={lead.url} target="_blank" rel="noreferrer"
                      className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> View post
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
