import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";

/**
 * Merge Tailwind CSS classes, resolving conflicts via tailwind-merge.
 * Combines clsx (conditional classes) with twMerge (specificity resolution).
 *
 * Usage:
 *   <div className={cn("px-4", isActive && "bg-blue-500", "px-2")} />
 *   // => "bg-blue-500 px-2"  (later px-2 wins over px-4)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Date Helpers ───────────────────────────────────────────────────────────

/**
 * Format a date for display in the UI.
 * @param date - Date or ISO string
 * @param pattern - date-fns format pattern (default: "MMM d, yyyy")
 */
export function formatDate(
  date: Date | string | number,
  pattern = "MMM d, yyyy",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern);
}

/**
 * Format a date with time for detailed views.
 */
export function formatDateTime(date: Date | string | number): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Human-readable relative time (e.g. "3 days ago", "in 2 hours").
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Deadline-aware display string with urgency indicators.
 * Returns formatted date + contextual label for deadlines.
 */
export function formatDeadline(date: Date | string | number): {
  label: string;
  isOverdue: boolean;
  isUrgent: boolean; // due today or tomorrow
} {
  const d = typeof date === "string" ? new Date(date) : date;
  const overdue = isPast(d) && !isToday(d);
  const urgent = isToday(d) || isTomorrow(d);
  const daysLeft = differenceInDays(d, new Date());

  let label: string;
  if (overdue) {
    label = `Overdue — ${format(d, "MMM d, yyyy")}`;
  } else if (isToday(d)) {
    label = "Due today";
  } else if (isTomorrow(d)) {
    label = "Due tomorrow";
  } else if (daysLeft <= 7) {
    label = `${daysLeft} days left — ${format(d, "MMM d")}`;
  } else {
    label = format(d, "MMM d, yyyy");
  }

  return { label, isOverdue: overdue, isUrgent: urgent };
}

// ─── String / Formatting Helpers ────────────────────────────────────────────

/**
 * Truncate a string to maxLength, appending "…" if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Format a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Generate initials from a name (e.g. "Amitoj Singh" → "AS").
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Slugify a string for URLs (e.g. "My Organization" → "my-organization").
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Misc ───────────────────────────────────────────────────────────────────

/**
 * Sleep for a given number of milliseconds.
 * Useful for artificial delays in Server Actions (UX feedback) or rate-limit backoff.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Type-safe Object.keys that returns (keyof T)[] instead of string[].
 */
export function objectKeys<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Pick specified keys from an object, returning a new object.
 * Type-safe alternative to manual destructuring + reconstruction.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
