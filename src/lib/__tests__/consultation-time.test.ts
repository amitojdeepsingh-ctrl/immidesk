import { describe, expect, it } from "vitest";
import { formatPacific, pacificBookingInstant, reminderDueAt } from "../consultation-time";

describe("Pacific consultations", () => {
  it("converts winter and summer wall times without using the server timezone", () => {
    expect(pacificBookingInstant("2026-01-12T09:00:00")).toBe("2026-01-12T17:00:00.000Z");
    expect(pacificBookingInstant("2026-08-25T09:00:00")).toBe("2026-08-25T16:00:00.000Z");
  });
  it("rejects malformed dates, offsets and nonexistent spring-forward times", () => {
    for (const value of ["garbage", "2026-02-30T09:00:00", "2026-03-08T02:30:00", "2026-08-25T09:00:00Z"]) {
      expect(() => pacificBookingInstant(value)).toThrow();
    }
  });
  it("labels both seasonal offsets explicitly", () => {
    expect(formatPacific("2026-01-12T17:00:00Z")).toContain("9:00 AM PST");
    expect(formatPacific("2026-08-25T16:00:00Z")).toContain("9:00 AM PDT");
  });
  it("reminds thirty minutes before the stored instant", () => {
    expect(reminderDueAt("2026-08-25T16:00:00Z")).toBe("2026-08-25T15:30:00.000Z");
  });
});
