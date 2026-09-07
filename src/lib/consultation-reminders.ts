import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail, orgSender } from "@/lib/email/resend";
import { formatPacific } from "@/lib/consultation-time";

export async function sendConsultationReminders() {
  const db = getSupabaseAdmin();
  const { data: due, error } = await db.rpc("claim_consultation_reminders");
  if (error) throw new Error("Could not claim consultation reminders");
  let sent = 0;
  let failed = 0;
  for (const claimed of due ?? []) {
    try {
      // Recheck after claiming: cancellations/reschedules must not send stale reminders.
      const { data: booking, error: bookingError } = await db.from("Consultation").select("*")
        .eq("id", claimed.id).eq("start_time", claimed.start_time).eq("status", "SCHEDULED").maybeSingle();
      if (bookingError) throw bookingError;
      if (!booking || Date.parse(booking.start_time) <= Date.now()) continue;
      const [{ data: org, error: orgError }, { data: consultant, error: consultantError }] = await Promise.all([
        db.from("Organization").select("name, email, settings").eq("id", booking.organization_id).single(),
        db.from("User").select("name, email").eq("id", booking.consultant_id).eq("organizationId", booking.organization_id).single(),
      ]);
      if (orgError || consultantError || !org || !consultant) throw new Error("Reminder identity unavailable");
      let email = booking.lead_email;
      let name = booking.lead_name;
      let phone = booking.lead_phone;
      if (!email && booking.client_id) {
        const { data: client, error: clientError } = await db.from("Client").select("email, firstName, phone")
          .eq("id", booking.client_id).eq("organizationId", booking.organization_id).single();
        if (clientError) throw clientError;
        email = client?.email;
        name = client?.firstName;
        phone = client?.phone;
      }
      if (!email) throw new Error("Reminder recipient unavailable");
      const time = formatPacific(booking.start_time);
      const text = `Hi ${name || "there"},\n\nYour phone consultation is scheduled for ${time}, in approximately 30 minutes.\n\nYou will receive a call from RCIC ${consultant.name}. We will call ${phone || "the number you provided"}. Please prepare your questions so they can be answered.\n\n${org.name}`;
      const html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
      const result = await sendEmail({
        ...orgSender({ ...org, email: org.email || consultant.email }),
        to: { email, name: name || undefined }, subject: `Consultation reminder - ${time}`,
        text, html,
        idempotencyKey: `consultation-reminder/${booking.id}/${Date.parse(booking.start_time)}`,
      });
      if (!result.success) throw new Error("Email provider rejected reminder");
      const { error: markError } = await db.from("Consultation")
        .update({ reminded_start_time: booking.start_time })
        .eq("id", booking.id).eq("start_time", booking.start_time);
      if (markError) throw markError;
      sent++;
    } catch {
      failed++;
      console.error("Consultation reminder failed; will retry");
    } finally {
      const { error: releaseError } = await db.from("Consultation").update({ reminder_claimed_at: null })
        .eq("id", claimed.id).eq("reminder_claimed_at", claimed.reminder_claimed_at);
      if (releaseError) console.error("Reminder lease release failed");
    }
    // Stay within the provider's default two-requests-per-second rate limit.
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return { sent, failed };
}
