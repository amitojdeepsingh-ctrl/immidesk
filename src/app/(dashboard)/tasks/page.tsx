"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Plus, Trash2, Calendar, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TaskCase {
  id: string;
  title: string;
  clientId: string;
}

interface Task {
  id: string;
  caseId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  assignedToId: string | null;
  case: TaskCase;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newCaseId, setNewCaseId] = useState("");
  const [cases, setCases] = useState<{ id: string; title: string; clientName: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchTasks = async () => {
    const res = await fetch("/api/tasks");
    const json = await res.json();
    setTasks(json.data ?? []);
    setLoading(false);
  };

  const fetchCases = async () => {
    const res = await fetch("/api/clients");
    const json = await res.json();
    const all = json.data ?? [];
    const flat = all.flatMap((c: { id: string; firstName: string; lastName: string; cases?: { id: string; title: string }[] }) =>
      (c.cases ?? []).map((ca: { id: string; title: string }) => ({
        id: ca.id,
        title: ca.title,
        clientName: `${c.firstName} ${c.lastName}`,
      }))
    );
    setCases(flat);
  };

  useEffect(() => {
    fetchTasks();
    fetchCases();
  }, []);

  const createTask = async () => {
    if (!newTitle.trim() || !newCaseId) return;
    setCreating(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: newCaseId, title: newTitle.trim(), dueDate: newDueDate || undefined }),
    });
    setNewTitle("");
    setNewDueDate("");
    setCreating(false);
    setShowForm(false);
    fetchTasks();
  };

  const toggleComplete = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: task.completedAt ? null : new Date().toISOString() }),
    });
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
  };

  const pending = tasks.filter(t => !t.completedAt);
  const completed = tasks.filter(t => t.completedAt);

  const dueUrgency = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    if (days < 0) return "overdue";
    if (days <= 2) return "urgent";
    if (days <= 7) return "soon";
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-zinc-400">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Tasks & Deadlines</h1>
          <p className="text-sm text-zinc-500">{pending.length} pending · {completed.length} completed</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-900">
          <select value={newCaseId} onChange={e => setNewCaseId(e.target.value)}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
            <option value="">Select a case...</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.title} — {c.clientName}</option>
            ))}
          </select>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title..."
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          <div className="flex items-center gap-3">
            <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
            <button onClick={createTask} disabled={creating || !newTitle.trim() || !newCaseId}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {pending.length === 0 && completed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          <Calendar className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500">No tasks yet</p>
          <p className="mt-1 text-xs text-zinc-400">Create a task to track deadlines</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-1">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">Pending ({pending.length})</h2>
              {pending.map(task => {
                const urgency = dueUrgency(task.dueDate);
                return (
                  <div key={task.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                      urgency === "overdue" ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20" :
                      urgency === "urgent" ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20" :
                      "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    )}>
                    <button onClick={() => toggleComplete(task)} className="mt-0.5 shrink-0 text-zinc-400 hover:text-green-500">
                      <Circle className="h-5 w-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{task.title}</p>
                      <Link href={`/clients/${task.case?.clientId}`} className="mt-0.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                        {task.case?.title ?? "Unknown case"}
                      </Link>
                      {task.dueDate && (
                        <div className="mt-1.5 flex items-center gap-1">
                          {urgency === "overdue" ? <AlertTriangle className="h-3 w-3 text-red-500" /> :
                           urgency === "urgent" ? <AlertTriangle className="h-3 w-3 text-amber-500" /> :
                           <Clock className="h-3 w-3 text-zinc-400" />}
                          <span className={cn(
                            "text-xs",
                            urgency === "overdue" ? "text-red-600 font-medium" :
                            urgency === "urgent" ? "text-amber-600 font-medium" :
                            "text-zinc-400"
                          )}>
                            {new Date(task.dueDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                            {urgency === "overdue" && " (overdue)"}
                          </span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="shrink-0 text-zinc-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-1">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">Completed ({completed.length})</h2>
              {completed.map(task => (
                <div key={task.id} className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <button onClick={() => toggleComplete(task)} className="mt-0.5 shrink-0 text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-500 line-through">{task.title}</p>
                    <Link href={`/clients/${task.case?.clientId}`} className="mt-0.5 text-xs text-zinc-400 hover:text-zinc-600">
                      {task.case?.title ?? "Unknown case"}
                    </Link>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="shrink-0 text-zinc-300 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
