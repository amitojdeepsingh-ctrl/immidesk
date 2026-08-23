"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

export function ChecklistShareButtons({
  waText,
  shareUrl,
  label,
}: {
  waText: string;
  shareUrl: string;
  label: string;
}) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fullUrl = typeof window === "undefined" ? shareUrl : `${window.location.origin}${shareUrl}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(waText + "\n\n🔗 " + fullUrl)}`;

  return (
    <div className="mt-5 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <Share2 className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Share this checklist
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-md bg-[#25D366] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
        >
          <Share2 className="h-3.5 w-3.5" /> Share via WhatsApp
        </a>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(waText);
              setCopiedText(true);
              setTimeout(() => setCopiedText(false), 2500);
            } catch {}
          }}
          className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copiedText ? "Checklist copied as text" : "Copy as text (paste anywhere)"}
        </button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(fullUrl);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2500);
            } catch {}
          }}
          className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copiedLink ? "Link copied" : `Copy ${label} link`}
        </button>
      </div>
    </div>
  );
}
