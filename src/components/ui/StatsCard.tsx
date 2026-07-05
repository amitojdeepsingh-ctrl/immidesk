import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  description?: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {title}
        </p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.positive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {trend.positive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}
