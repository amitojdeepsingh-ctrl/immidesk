"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationEvent =
  | "TASK_OVERDUE"
  | "TASK_DUE_TOMORROW"
  | "TASK_ASSIGNED"
  | "CASE_STATUS_CHANGED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_EXPIRING"
  | "RETAINER_SIGNED"
  | "PROSPECT_ASSIGNED"
  | "FOLLOW_UP_REACHED"
  | "INVOICE_OVERDUE"
  | "PAYMENT_RECEIVED"
  | "CONSULTATION_BOOKED"
  | "CONSULTATION_REMINDER";

type Preference = {
  event: NotificationEvent;
  email: boolean;
  inApp: boolean;
};

type PreferencesData = Record<string, { email: boolean; inApp: boolean }>;

const EVENT_CATEGORIES: { label: string; events: NotificationEvent[] }[] = [
  {
    label: "Tasks",
    events: ["TASK_OVERDUE", "TASK_DUE_TOMORROW", "TASK_ASSIGNED"],
  },
  {
    label: "Cases",
    events: [
      "CASE_STATUS_CHANGED",
      "DOCUMENT_UPLOADED",
      "DOCUMENT_EXPIRING",
      "RETAINER_SIGNED",
    ],
  },
  {
    label: "Prospects",
    events: ["PROSPECT_ASSIGNED", "FOLLOW_UP_REACHED"],
  },
  {
    label: "Billing",
    events: ["INVOICE_OVERDUE", "PAYMENT_RECEIVED"],
  },
  {
    label: "Consultations",
    events: ["CONSULTATION_BOOKED", "CONSULTATION_REMINDER"],
  },
];

function eventLabel(event: string): string {
  return event
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<PreferencesData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setPreferences(j.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (event: string, channel: "email" | "inApp") => {
    setPreferences((prev) => ({
      ...prev,
      [event]: {
        email:
          channel === "email"
            ? !(prev[event]?.email ?? false)
            : prev[event]?.email ?? false,
        inApp:
          channel === "inApp"
            ? !(prev[event]?.inApp ?? false)
            : prev[event]?.inApp ?? false,
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });
    setSaving(false);
  };

  return (
    <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Notification Preferences
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Choose how you receive notifications
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || loading}
          className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 px-6 py-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex items-center gap-4">
                <div className="h-8 flex-1 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-8 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-8 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-5">
          <div className="mb-3 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 w-16 justify-center">
              <Bell className="h-3.5 w-3.5" />
              Email
            </div>
            <div className="flex items-center gap-1.5 w-16 justify-center">
              <BellOff className="h-3.5 w-3.5" />
              In-App
            </div>
          </div>

          {EVENT_CATEGORIES.map((cat) => (
            <div key={cat.label} className="mb-4 last:mb-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {cat.label}
              </p>
              <div className="space-y-1">
                {cat.events.map((event) => {
                  const pref = preferences[event];
                  return (
                    <div
                      key={event}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <div className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {eventLabel(event)}
                      </div>
                      <div className="flex items-center gap-2 w-16 justify-center">
                        <button
                          onClick={() => toggle(event, "email")}
                          className={cn(
                            "relative h-5 w-9 rounded-full transition-colors",
                            pref?.email
                              ? "bg-zinc-900 dark:bg-zinc-50"
                              : "bg-zinc-200 dark:bg-zinc-700",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-sm dark:bg-zinc-900",
                              pref?.email && "translate-x-4",
                            )}
                          />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 w-16 justify-center">
                        <button
                          onClick={() => toggle(event, "inApp")}
                          className={cn(
                            "relative h-5 w-9 rounded-full transition-colors",
                            pref?.inApp
                              ? "bg-zinc-900 dark:bg-zinc-50"
                              : "bg-zinc-200 dark:bg-zinc-700",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-sm dark:bg-zinc-900",
                              pref?.inApp && "translate-x-4",
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
