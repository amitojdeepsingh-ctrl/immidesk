"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CASE_STATUSES, PRIORITY_STYLES } from "../case-styles";

export function CaseStatusSelect({ caseId, status }: { caseId: string; status: string }) {
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function change(next: string) {
    setValue(next);
    setSaving(true);
    try {
      await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        disabled={saving}
        onChange={(e) => change(e.target.value)}
        className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        {CASE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="absolute right-7 h-3 w-3 animate-spin text-zinc-400" />}
    </div>
  );
}

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export function CasePrioritySelect({ caseId, priority }: { caseId: string; priority: string }) {
  const [value, setValue] = useState(priority);
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    setValue(next);
    setSaving(true);
    try {
      await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value}
      disabled={saving}
      onChange={(e) => change(e.target.value)}
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50",
        PRIORITY_STYLES[value] ?? PRIORITY_STYLES.NORMAL,
      )}
    >
      {PRIORITIES.map((p) => (
        <option key={p} value={p} className="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {p}
        </option>
      ))}
    </select>
  );
}
