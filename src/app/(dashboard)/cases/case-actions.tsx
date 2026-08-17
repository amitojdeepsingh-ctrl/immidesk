"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export function MarkSubmittedButton({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const markSubmitted = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUBMITTED" }),
      });
      const j = await res.json();
      if (j.data) setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> Submitted</span>;
  }

  return (
    <button
      onClick={markSubmitted}
      disabled={loading}
      className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Submitted"}
    </button>
  );
}
