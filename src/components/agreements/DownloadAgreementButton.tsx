"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function DownloadAgreementButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/agreement-pdf`);

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Download failed");
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("application/pdf")) {
        // Direct PDF response — convert to blob and download
        const blob = await res.blob();
        const disposition = res.headers.get("content-disposition") ?? "";
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match?.[1] ?? "signed-agreement.pdf";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Signed storage URL response
        const json = await res.json();
        const a = document.createElement("a");
        a.href = json.url;
        a.download = json.filename ?? "signed-agreement.pdf";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      setError("Failed to download");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {loading ? "Preparing…" : "Download Signed PDF"}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
