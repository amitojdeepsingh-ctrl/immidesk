"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaseTask {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
}

function fmtDue(s: string | null): { label: string; overdue: boolean } | null {
  if (!s) return null;
  const d = new Date(s);
  const label = d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  const endOfDay = new Date(d);
  endOfDay.setHours(23, 59, 59, 999);
  return { label, overdue: endOfDay.getTime() < Date.now() };
}

export function CaseTasks({ caseId, initialTasks }: { caseId: string; initialTasks: CaseTask[] }) {
  const [tasks, setTasks] = useState<CaseTask[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function addTask() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, title: title.trim(), dueDate: dueDate || undefined }),
      });
      const j = await res.json();
      if (j.data) setTasks((prev) => [j.data, ...prev]);
      setTitle("");
      setDueDate("");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(t: CaseTask) {
    setBusyId(t.id);
    try {
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: t.completedAt ? null : new Date().toISOString() }),
      });
      const j = await res.json();
      if (j.data) setTasks((prev) => prev.map((x) => (x.id === t.id ? j.data : x)));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  const openCount = tasks.filter((t) => !t.completedAt).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{openCount} open of {tasks.length}</p>
      </div>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addTask();
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task…"
          className="h-8 flex-1 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-500/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        />
        <button
          type="submit"
          disabled={adding || !title.trim()}
          className="flex h-8 items-center gap-1 rounded-md bg-brand-600 px-2.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-brand-500 dark:text-white"
        >
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700">
          No tasks yet
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {tasks.map((t) => {
            const due = fmtDue(t.dueDate);
            return (
              <li key={t.id} className="flex items-center gap-2 py-2">
                <button onClick={() => toggle(t)} disabled={busyId === t.id} className="shrink-0">
                  {t.completedAt ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600" />
                  )}
                </button>
                <span className={cn("flex-1 text-sm", t.completedAt ? "text-zinc-400 line-through dark:text-zinc-600" : "text-zinc-800 dark:text-zinc-200")}>
                  {t.title}
                </span>
                {due && (
                  <span className={cn("text-[11px]", due.overdue && !t.completedAt ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-400")}>
                    {due.label}
                  </span>
                )}
                <button onClick={() => remove(t.id)} disabled={busyId === t.id} className="text-zinc-300 hover:text-red-500" title="Delete task">
                  {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
