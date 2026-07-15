"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Rule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
};

export default function ConsultationSettings() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/consultations/availability")
      .then(r => r.json())
      .then(j => {
        if (j.data) setRules(j.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const upsertRule = async (dayOfWeek: number) => {
    setSaving(true);
    const existing = rules.find(r => r.day_of_week === dayOfWeek);
    const body = {
      dayOfWeek,
      startTime: existing?.start_time ?? "09:00",
      endTime: existing?.end_time ?? "17:00",
      slotDuration: existing?.slot_duration ?? 30,
      isActive: existing ? !existing.is_active : true,
    };

    const res = await fetch("/api/consultations/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.data) {
      setRules(prev => {
        const idx = prev.findIndex(r => r.day_of_week === dayOfWeek);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = json.data;
          return next;
        }
        return [...prev, json.data];
      });
    }
    setSaving(false);
  };

  const updateTime = (dayOfWeek: number, field: "start_time" | "end_time", value: string) => {
    setRules(prev => prev.map(r => r.day_of_week === dayOfWeek ? { ...r, [field]: value } : r));
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Consultation Availability</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Set your weekly availability for public booking at <code className="text-xs text-zinc-600">/book/your-slug</code></p>
      </div>
      <div className="space-y-2 px-6 py-5">
        {DAYS.map((day, i) => {
          const rule = rules.find(r => r.day_of_week === i);
          return (
            <div key={i} className="flex items-center gap-4">
              <button onClick={() => upsertRule(i)}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                  rule?.is_active
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "border-zinc-200 text-zinc-400 dark:border-zinc-700"
                }`}>
                {rule?.is_active ? "✓" : "+"}
              </button>
              <span className="w-24 text-sm text-zinc-700 dark:text-zinc-300">{day.slice(0, 3)}</span>
              {rule?.is_active ? (
                <div className="flex items-center gap-2">
                  <input type="time" value={rule.start_time} onChange={e => updateTime(i, "start_time", e.target.value)}
                    className="w-24 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
                  <span className="text-xs text-zinc-400">to</span>
                  <input type="time" value={rule.end_time} onChange={e => updateTime(i, "end_time", e.target.value)}
                    className="w-24 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
                  <span className="text-[10px] text-zinc-400">{rule.slot_duration}min</span>
                  <button onClick={() => updateTime(i, "start_time", rule.start_time)} className="hidden">save</button>
                </div>
              ) : (
                <span className="text-xs text-zinc-400">Not available</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
