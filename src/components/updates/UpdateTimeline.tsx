"use client";

import { formatRelativeTime } from "@/lib/utils";
import {
  Bell,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface UpdateItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  user?: { name: string; email: string };
}

interface UpdateTimelineProps {
  updates: UpdateItem[];
  caseId: string;
}

const actionIcons: Record<string, typeof Bell> = {
  CLIENT_UPDATED: FileText,
  CLIENT_DELETED: AlertTriangle,
  CASE_CREATED: FileText,
  CASE_UPDATED: FileText,
  DOCUMENT_UPLOADED: FileText,
  DOCUMENT_DELETED: AlertTriangle,
  FORM_SUBMITTED: CheckCircle,
  DEADLINE_MISSED: AlertTriangle,
  CLIENT_COMMUNICATION: Bell,
  PNP_DRAW_NOTIFIED: Bell,
  AGREEMENT_SIGNED: CheckCircle,
};

const actionColors: Record<string, string> = {
  CLIENT_UPDATED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CLIENT_DELETED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  CASE_CREATED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  DOCUMENT_UPLOADED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  FORM_SUBMITTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  DEADLINE_MISSED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  CLIENT_COMMUNICATION: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  PNP_DRAW_NOTIFIED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  AGREEMENT_SIGNED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

function getIcon(action: string) {
  return actionIcons[action] ?? Clock;
}

function getColorClass(action: string) {
  return actionColors[action] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function UpdateTimeline({ updates }: UpdateTimelineProps) {
  if (updates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-12 text-center dark:border-zinc-700">
        <Clock className="mx-auto mb-2 h-6 w-6 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No updates recorded yet
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {updates.map((update, index) => {
        const Icon = getIcon(update.action);
        const colorClass = getColorClass(update.action);
        const isLast = index === updates.length - 1;

        return (
          <div key={update.id} className="relative flex gap-4 pb-8">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 h-full w-px bg-zinc-200 dark:bg-zinc-700" />
            )}

            {/* Icon */}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
            >
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {formatActionLabel(update.action)}
                </p>
                <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                  {formatRelativeTime(update.timestamp)}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {update.entityType} · {update.entityId.slice(0, 8)}…
                {update.user && (
                  <span> · by {update.user.name}</span>
                )}
              </p>

              {update.metadata && Object.keys(update.metadata).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-50 p-2 text-[10px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  {JSON.stringify(update.metadata, null, 1)}
                </pre>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
