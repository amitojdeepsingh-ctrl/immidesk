/**
 * Minimal iCalendar (RFC 5545) event builder — no dependencies.
 * Produces a valid .ics file body for email attachments.
 */

export interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  /** Physical or video location shown in the event */
  location?: string;
  /** ISO datetime */
  start: string;
  /** ISO datetime */
  end: string;
  organizerName?: string;
  organizerEmail?: string;
  attendeeName?: string;
  attendeeEmail?: string;
}

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines at 75 octets per RFC 5545 §3.1. */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 0) {
    parts.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  return parts.join("\r\n");
}

export function buildIcs(ev: IcsEvent): string {
  const stamp = icsDate(new Date().toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ImmigDesk//Consultation Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    fold(`UID:${ev.uid}`),
    `DTSTAMP:${stamp}`,
    fold(`DTSTART:${icsDate(ev.start)}`),
    fold(`DTEND:${icsDate(ev.end)}`),
    fold(`SUMMARY:${escapeText(ev.title)}`),
    ...(ev.description ? [fold(`DESCRIPTION:${escapeText(ev.description)}`)] : []),
    ...(ev.location ? [fold(`LOCATION:${escapeText(ev.location)}`)] : []),
    ...(ev.organizerEmail
      ? [fold(`ORGANIZER;CN=${escapeText(ev.organizerName ?? ev.organizerEmail)}:mailto:${ev.organizerEmail}`)]
      : []),
    ...(ev.attendeeEmail
      ? [fold(`ATTENDEE;CN=${escapeText(ev.attendeeName ?? ev.attendeeEmail)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${ev.attendeeEmail}`)]
      : []),
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
