"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Copy, Check, Share2, ExternalLink, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLIENT_CHECKLISTS, CLIENT_CHECKLIST_LABELS, clientChecklistAsText } from "@/lib/client-checklists";

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  caseType?: string;
}

export default function ChecklistsPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/organization").then(r => r.json()).catch(() => null),
      fetch("/api/clients?perPage=500").then(r => r.json()).catch(() => null),
      fetch("/api/clients/case-types").then(r => r.json()).catch(() => null),
    ]).then(([orgRes, clientRes, caseTypeRes]) => {
      if (orgRes?.data?.slug) setSlug(orgRes.data.slug);
      const list: ClientRow[] = clientRes?.data ?? [];
      const typeMap = new Map<string, string>(
        (Array.isArray(caseTypeRes?.data) ? caseTypeRes.data : []).map(
          (x: { clientId: string; caseType: string }) => [x.clientId, x.caseType],
        ),
      );
      setClients(list.map(c => ({ ...c, caseType: typeMap.get(c.id) })));
    }).finally(() => setLoading(false));
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const baseUrl = typeof window === "undefined" ? "" : window.location.origin;
  const linkFor = (type: string) =>
    `${baseUrl}/checklist?${slug ? `org=${slug}&` : ""}type=${type}`;

  const textFor = (type: string) =>
    clientChecklistAsText(type, {
      firmName: selectedClient ? undefined : undefined,
      label: CLIENT_CHECKLIST_LABELS[type] ?? undefined,
      link: linkFor(type),
    });

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const waShare = (type: string) => {
    const clientName = selectedClient ? selectedClient.firstName : "";
    let text = textFor(type);
    if (clientName) text = `Hi ${clientName}! 👋\n\n` + text;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const types = Object.keys(CLIENT_CHECKLISTS);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Checklists</h1>
        <p className="text-sm text-zinc-500">Client-ready document checklists — share via WhatsApp or link</p>
      </div>

      {/* Client picker */}
      <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800/60 dark:bg-brand-500/5">
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <User className="h-3.5 w-3.5" /> Personalize for a client (optional)
        </label>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        ) : (
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          >
            <option value="">— No client selected (generic) —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}{c.caseType ? ` — ${CLIENT_CHECKLIST_LABELS[c.caseType] ?? c.caseType.replace(/_/g, " ")}` : ""}
              </option>
            ))}
          </select>
        )}
        {selectedClient?.caseType && CLIENT_CHECKLISTS[selectedClient.caseType] && (
          <p className="mt-2 text-xs text-brand-700 dark:text-brand-300">
            {selectedClient.firstName}'s case type: <strong>{CLIENT_CHECKLIST_LABELS[selectedClient.caseType] ?? selectedClient.caseType}</strong> — that card is marked below.
          </p>
        )}
      </div>

      {/* Type grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => {
          const label = CLIENT_CHECKLIST_LABELS[type] ?? type.replace(/_/g, " ");
          const isClientType = selectedClient?.caseType === type;
          return (
            <div
              key={type}
              className={cn(
                "flex flex-col rounded-lg border bg-white p-4 transition-colors dark:bg-zinc-900",
                isClientType
                  ? "border-brand-400 ring-1 ring-brand-300 dark:border-brand-600 dark:ring-brand-800"
                  : "border-zinc-200 dark:border-zinc-800",
              )}
            >
              <div className="mb-3 flex items-start gap-2.5">
                <ClipboardList className={cn("mt-0.5 h-4 w-4 shrink-0", isClientType ? "text-brand-600 dark:text-brand-400" : "text-zinc-400")} />
                <h3 className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                  {label}
                  {isClientType && <span className="ml-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{selectedClient?.firstName}</span>}
                </h3>
              </div>
              <p className="mb-3 text-xs text-zinc-400">
                {CLIENT_CHECKLISTS[type].length} items · no form numbers · client-safe
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                <a
                  href={linkFor(type)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <ExternalLink className="h-3 w-3" /> Open
                </a>
                <a
                  href={waShare(type)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md bg-[#25D366] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Share2 className="h-3 w-3" /> WhatsApp
                </a>
                <button
                  onClick={() => copy(`text-${type}`, textFor(type))}
                  className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {copiedKey === `text-${type}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  Text
                </button>
                <button
                  onClick={() => copy(`link-${type}`, linkFor(type))}
                  className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {copiedKey === `link-${type}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  Link
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
