import { timingSafeEqual } from "node:crypto";
import { sendConsultationReminders } from "@/lib/consultation-reminders";

export async function POST(req: Request) {
  const secret = process.env.CONSULTATION_REMINDER_SECRET;
  if (!secret) return Response.json({ error: "Reminder scheduler not configured" }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendConsultationReminders();
    return Response.json(result, { status: result.failed ? 503 : 200 });
  } catch {
    return Response.json({ error: "Reminder processing failed" }, { status: 503 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
