import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const CONSULTATION_TIME_ZONE = "America/Los_Angeles";

/** Booking inputs are Pacific wall times, never the visitor's local zone. */
export function pacificBookingInstant(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(value)) {
    throw new Error("Choose a valid Pacific appointment time");
  }
  const date = fromZonedTime(value, CONSULTATION_TIME_ZONE);
  if (!Number.isFinite(date.getTime()) || formatInTimeZone(date, CONSULTATION_TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ss") !== value) {
    throw new Error("This Pacific appointment time does not exist");
  }
  return date.toISOString();
}

export function formatPacific(value: string): string {
  return formatInTimeZone(value, CONSULTATION_TIME_ZONE, "EEEE, MMMM d, yyyy 'at' h:mm a zzz");
}

export function reminderDueAt(start: string): string {
  return new Date(new Date(start).getTime() - 30 * 60_000).toISOString();
}
