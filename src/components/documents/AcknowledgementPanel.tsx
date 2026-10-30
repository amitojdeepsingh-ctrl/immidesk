"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Copy, Download, FileSignature, Loader2, Mail } from "lucide-react";

export interface AcknowledgementRow {
  id: string;
  status: string;
  itemCount: number;
  createdAt: string;
  signedAt: string | null;
  printedName: string | null;
  viewedAt: string | null;
  url: string | null;
  pdfUrl: string | null;
}

interface Props {
  clientId: string;
  documentCount: number;
  rows: AcknowledgementRow[];
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function AcknowledgementPanel({ clientId, documentCount, rows }: Props) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<{ url: string; itemCount: number; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function create() {
    setCreating(true);
    setError(null);
    setLatest(null);
    try {
      const res = await fetch("/api/acknowledgements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not create the acknowledgement");
      setLatest({ url: json.data.url, itemCount: json.data.itemCount, emailed: json.data.emailed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy — select the link manually.");
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <FileSignature className="h-4 w-4 text-zinc-500" />
            Document acknowledgement
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            The client signs a statement confirming they provided the {documentCount} document
            {documentCount === 1 ? "" : "s"} on file. The signed record keeps a snapshot of the list,
            signature, name, date and IP.
          </p>
        </div>
        <button
          onClick={create}
          disabled={creating || documentCount === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-40 dark:bg-brand-500"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
          Request acknowledgement
        </button>
      </div>

      {documentCount === 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Upload documents first. The acknowledgement covers every document on this client&apos;s file.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {latest && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
            Sent — covers {latest.itemCount} document{latest.itemCount === 1 ? "" : "s"}
            {latest.emailed ? " · email delivered to the client" : " · email failed, share the link below"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-white px-2 py-1 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              {latest.url}
            </code>
            <button
              onClick={() => copy("latest", latest.url)}
              className="inline-flex shrink-0 items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-white dark:border-zinc-700 dark:text-zinc-300"
            >
              <Copy className="h-3 w-3" /> {copied === "latest" ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Documents</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Sent</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Signed</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    {row.status === "SIGNED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Signed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Clock className="h-3 w-3" /> {row.viewedAt ? "Viewed" : "Awaiting signature"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{row.itemCount}</td>
                  <td className="px-3 py-2 text-zinc-500">{fmt(row.createdAt)}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {row.signedAt ? `${fmt(row.signedAt)}${row.printedName ? ` · ${row.printedName}` : ""}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.status === "SIGNED" && row.pdfUrl ? (
                      <Link
                        href={row.pdfUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        <Download className="h-3 w-3" /> Signed PDF
                      </Link>
                    ) : row.url ? (
                      <button
                        onClick={() => copy(row.id, row.url!)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-300"
                      >
                        <Copy className="h-3 w-3" /> {copied === row.id ? "Copied" : "Copy link"}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
