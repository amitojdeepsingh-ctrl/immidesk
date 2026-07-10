"use client";

import {
  Activity,
  FileText,
  MessageSquare,
  FilePen,
  CreditCard,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  _type: string;
  _date: string;
  action?: string;
  content?: string;
  senderName?: string;
  sentByClient?: boolean;
  agreementTitle?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  notes?: string;
  [key: string]: unknown;
}

const EVENT_CONFIG: Record<string, { icon: typeof Activity; label: string; color: string }> = {
  activity: { icon: Activity, label: "Activity", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  portal_message: { icon: MessageSquare, label: "Portal Message", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  agreement_signed: { icon: FilePen, label: "Agreement Signed", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  payment: { icon: CreditCard, label: "Payment", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

function formatAction(action: string): string {
  return action.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

export function TimelineView({ clientName, events }: { clientName: string; events: TimelineEvent[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Timeline</h2>
        <p className="text-xs text-zinc-500">{events.length} events for {clientName}</p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
          <Activity className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500">No timeline events yet</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-3">
            {events.map((event, i) => {
              const cfg = EVENT_CONFIG[event._type] ?? EVENT_CONFIG.activity;
              const Icon = cfg.icon;

              return (
                <div key={`${event._type}-${i}`} className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 z-10",
                    cfg.color.replace("text-", "bg-").split(" ")[0] ?? "bg-white"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{cfg.label}</span>
                      <span className="text-[10px] text-zinc-400">{formatRelativeTime(event._date)}</span>
                    </div>
                    {event._type === "activity" && (
                      <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                        {formatAction(event.action as string)}
                        {event.notes && <span className="text-zinc-400"> — {event.notes}</span>}
                      </p>
                    )}
                    {event._type === "portal_message" && (
                      <div>
                        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                          {event.senderName as string}{event.sentByClient ? " (via portal)" : ""}
                        </p>
                        <p className="mt-1 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {event.content as string}
                        </p>
                      </div>
                    )}
                    {event._type === "agreement_signed" && (
                      <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                        {event.agreementTitle as string} —
                        <span className="font-medium text-green-600"> ${Number(event.feeAmount).toLocaleString()} {event.feeCurrency as string}</span>
                      </p>
                    )}
                    {event._type === "payment" && (
                      <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium text-emerald-600">${Number(event.amount).toLocaleString()} {event.currency as string}</span>
                        {" via "}{event.paymentMethod as string}
                        {event.notes && <span className="text-zinc-400"> — {event.notes}</span>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
