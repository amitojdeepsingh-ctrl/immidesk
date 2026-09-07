import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/errors";
import { sendEmail, orgSender } from "@/lib/email/resend";
import { buildIcs } from "@/lib/ics";
import { formatPacific, pacificBookingInstant } from "@/lib/consultation-time";
import { z } from "zod";

const bookingSchema = z.object({
  slug: z.string().min(1).max(150),
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(40),
  startTime: z.string(), endTime: z.string(),
  consultantId: z.string().min(1).max(100),
  title: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = bookingSchema.parse(await req.json());
    const { slug, name, email, phone, startTime, endTime, consultantId, title } = body;

    if (!slug || !name || !email || !phone || !startTime || !endTime || !consultantId) {
      return errorResponse("MISSING_FIELDS", "Missing required fields (phone is required — the RCIC calls you)", null, 400);
    }

    const db = getSupabaseAdmin();

    const { data: org } = await db
      .from("Organization")
      .select("id, name, email, settings")
      .eq("slug", slug)
      .single();

    if (!org) return errorResponse("NOT_FOUND", "Organization not found", null, 404);

    let startUtc: string;
    let endUtc: string;
    try {
      startUtc = pacificBookingInstant(startTime);
      endUtc = pacificBookingInstant(endTime);
    } catch {
      return errorResponse("INVALID_TIME", "Choose a valid Pacific appointment time", null, 422);
    }
    if (startUtc <= new Date().toISOString() || endUtc <= startUtc || startTime.slice(0, 10) !== endTime.slice(0, 10)) {
      return errorResponse("INVALID_TIME", "Choose a future appointment on the same day", null, 422);
    }
    const { data: consultant, error: consultantError } = await db.from("User")
      .select("id, name, email").eq("id", consultantId).eq("organizationId", org.id).maybeSingle();
    if (consultantError) throw consultantError;
    if (!consultant) return errorResponse("NOT_FOUND", "Consultant not found", null, 404);
    const { data: rule, error: ruleError } = await db.from("AvailabilityRule").select("*")
      .eq("organization_id", org.id).eq("user_id", consultantId).eq("is_active", true)
      .eq("day_of_week", new Date(`${startTime.slice(0, 10)}T12:00:00Z`).getUTCDay()).maybeSingle();
    if (ruleError) throw ruleError;
    const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const startMinute = minutes(startTime.slice(11));
    const endMinute = minutes(endTime.slice(11));
    if (!rule || rule.slot_duration <= 0 || startMinute < minutes(rule.start_time) || endMinute > minutes(rule.end_time)
      || endMinute - startMinute !== rule.slot_duration || (startMinute - minutes(rule.start_time)) % rule.slot_duration !== 0) {
      return errorResponse("INVALID_SLOT", "This appointment is outside the consultant's availability", null, 422);
    }

    const { data: existing, error: overlapError } = await db
      .from("Consultation")
      .select("id")
      .eq("consultant_id", consultantId)
      .lt("start_time", endUtc)
      .gt("end_time", startUtc)
      .in("status", ["SCHEDULED", "IN_PROGRESS"])
      .limit(1);
    if (overlapError) throw overlapError;

    if (existing?.length) return errorResponse("SLOT_TAKEN", "This time slot is already booked", null, 409);

    const roomName = `consultation_${org.id}_${Date.now()}`;

    const { data: consultation, error } = await db
      .from("Consultation")
      .insert({
        organization_id: org.id,
        consultant_id: consultantId,
        title: title ?? `Consultation with ${name}`,
        lead_name: name,
        lead_email: email,
        lead_phone: phone ?? null,
        start_time: startUtc,
        end_time: endUtc,
        status: "SCHEDULED",
        room_name: roomName,
      })
      .select()
      .single();

    if (error?.code === "23P01") return errorResponse("SLOT_TAKEN", "This time slot is already booked", null, 409);
    if (error) throw error;

    // ── Bell notification for the consultant ────────────────────────────────
    const { error: notificationError } = await db.from("Notification").insert({
      userId: consultantId,
      title: `New booking — ${name}`,
      message: `Phone consultation: ${formatPacific(startUtc)}.`,
      link: `/consultations/${consultation.id}`,
    });
    if (notificationError) console.error("Booking notification failed", notificationError.code);

    // ── Confirmation + calendar invite to the client ────────────────────────
    try {
      const rcicName = consultant?.name ? `RCIC ${consultant.name}` : org.name;
      const startLocal = formatPacific(startUtc);
      const sender = orgSender({ name: org.name, email: org.email ?? undefined, settings: org.settings });

      const ics = buildIcs({
        uid: `${consultation.id}@immigdesk`,
        title: `${org.name} — Phone Consultation`,
        description: `You will receive a phone call from ${rcicName}. Prepare your questions so they can be answered.`,
        location: "Phone call — we will call the number you provided",
        start: startUtc,
        end: endUtc,
        organizerName: rcicName,
        organizerEmail: sender.from.match(/<(.+)>/)?.[1] ?? undefined,
        attendeeName: name,
        attendeeEmail: email,
      });

      await sendEmail({
        ...sender,
        to: { email, name },
        subject: `Consultation Confirmed — ${startLocal}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
            <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">You're booked, ${name}!</h2>
            <p style="color:#555">Your consultation is confirmed for:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
              <tr><td style="padding:14px;background:#f4f4f5;border-radius:8px">
                <p style="margin:0 0 6px;font-size:14px"><strong>📅 ${startLocal}</strong></p>
                <p style="margin:0;font-size:13px;color:#555">${title ?? "Immigration consultation"} · phone consultation</p>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
              <tr><td style="padding:16px;background:#eef3fb;border-radius:8px;border-left:4px solid #35599C">
                <p style="margin:0 0 6px;font-size:14px"><strong>📞 You will receive a call from ${rcicName}.</strong></p>
                <p style="margin:0;font-size:13px;color:#444">We will call you at <strong>${phone}</strong> at the scheduled time. Please prepare your questions in advance so they can all be answered during the call.</p>
              </td></tr>
            </table>
            <p style="font-size:12px;color:#888">The attached calendar file adds this to Outlook, Google or Apple Calendar with a reminder one hour before.</p>
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0"/>
            <p style="font-size:11px;color:#888">${org.name} · Immigration Consulting Services</p>
          </div>
        `,
        attachments: [
          {
            filename: "consultation.ics",
            content: Buffer.from(ics, "utf-8"),
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
          },
        ],
      }).catch(e => console.warn("Booking confirmation email failed:", e));

      // Notify the consultant
      if (consultant?.email) {
        await sendEmail({
          to: { email: consultant.email, name: consultant.name ?? "" },
          subject: `New Booking — ${name}, ${startLocal}`,
          html: `<p>${name} booked a phone consultation for <strong>${startLocal}</strong>.</p><p>Call them at <strong>${phone}</strong> (email: ${email}).</p><p>Manage it in ImmigDesk → Consultations.</p>`,
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Booking post-processing failed:", e);
    }

    return successResponse(consultation, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
