"use client";

import { useState, useEffect } from "react";
import { Bell, Calendar, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ComplianceItem = {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  status: string;
  clientName: string;
};

export default function CompliancePage() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/consultations?status=SCHEDULED")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          const mapped = j.data.map((c: { id: string; title: string; start_time: string; lead_name: string | null; client: { firstName: string; lastName: string } | null }) => ({
            id: c.id,
            title: c.title,
            dueDate: c.start_time,
            type: "Consultation",
            status: "upcoming",
            clientName: c.client ? `${c.client.firstName} ${c.client.lastName}` : c.lead_name ?? "Unknown",
          }));
          setItems(mapped);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <Bell className="h-5 w-5 text-rose-600" />
          Compliance Deadlines
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Track upcoming deadlines, renewals, and compliance events
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No upcoming deadlines</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{item.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.clientName} — {new Date(item.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {item.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
