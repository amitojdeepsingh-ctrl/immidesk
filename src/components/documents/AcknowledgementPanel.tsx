"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Copy, Download, FileSignature, Loader2, Mail, Send } from "lucide-react";

export interface AcknowledgementRow {
  id: string;
  status: string;
  itemCount: number;
  createdAt: string;
  signedAt: string | null;
  printedName: string | null;
  viewedAt: string | null;
  sourceDocumentName: string | null;
  url: string | null;
  pdfUrl: string | null;
}

export interface PdfDocumentOption {
  id: string;
  name: string;
}

interface Props {
  pdfDocuments: PdfDocumentOption[];
  rows: AcknowledgementRow[];
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function AcknowledgementPanel({ pdfDocuments, rows }: Props) {
  const [selected, setSelected] = useState<string>("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<{ url: string; reference: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function attach() {
    if (!selected) return setError("Choose the merged PDF first.");
    setWorking(true);
    setError(null);
    setLatest(null);
    try {
      const res = await fetch("/api/acknowledgements/attach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: selected }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not attach the acknowledgement page");
      setLatest({ url: json.data.url, reference: json.data.reference, emailed: json.data.emailed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWorking(false);
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
      <div className="mb-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <FileSignature className="h-4 w-4 text-zinc-500" />
          Acknowledgement page
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Pick your merged PDF. The system appends one page — the confirmation statement plus
          Client name, Signature and Date — and sends the client a link to sign it.
        </p>
      </div>

      {pdfDocuments.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          No PDFs on this client&apos;s file yet. Upload the merged PDF first.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">Choose the merged PDF…</option>
              {pdfDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
            <button
              onClick={attach}
              disabled={working || !selected}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-40 dark:bg-brand-500"
            >
              {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Add page &amp; send
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          {latest && (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                Page appended · reference {latest.reference}
                {latest.emailed ? " · email sent to the client" : " · email failed, share the link below"}
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
              <p className="mt-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                The combined file is now on the client&apos;s documents list.
              </p>
            </div>
          )}
        </>
      )}

      {rows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Attached to</th>
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
                  <td className="max-w-[16rem] truncate px-3 py-2 text-zinc-600 dark:text-zinc-400" title={row.sourceDocumentName ?? ""}>
                    {row.sourceDocumentName ?? "—"}
                  </td>
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
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                        <Mail className="h-3 w-3" /> —
                      </span>
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
