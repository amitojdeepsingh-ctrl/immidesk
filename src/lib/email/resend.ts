// ═══════════════════════════════════════════════════════════════════════════
// ImmigDesk — Resend Email Client
// ═══════════════════════════════════════════════════════════════════════════
// Singleton Resend client with a typed sendEmail wrapper, rate-limit
// awareness, and error normalization. All transactional email flows
// (9 triggers per the technical spec) route through this module.
//
// Usage:
//   import { sendEmail } from "@/lib/email/resend";
//   const result = await sendEmail({ to, subject, html, tags });
// ═══════════════════════════════════════════════════════════════════════════

import { Resend } from "resend";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailParams {
  from?: string;
  to: EmailRecipient | EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  scheduledAt?: string; // ISO 8601 for scheduled delivery
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Lazy Resend Client Singleton ──────────────────────────────────────────

const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

function getResendClient(): Resend {
  if (globalForResend.resend) return globalForResend.resend;
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your .env file. " +
      "Get your API key at https://resend.com/api-keys",
    );
  }
  const client = new Resend(apiKey);
  globalForResend.resend = client;
  return client;
}

const DEFAULT_FROM = process.env["RESEND_FROM_EMAIL"] ?? "ADS Immigration Services <onboarding@resend.dev>";
const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

// ─── sendEmail — Typed Wrapper ─────────────────────────────────────────────

/**
 * Send a transactional email via Resend.
 *
 * Normalizes single/multiple recipients, attaches default sender when
 * omitted, and returns a structured result so callers never have to
 * catch raw Resend errors.
 *
 * Rate limits: Resend free tier allows 100 emails/day. This wrapper
 * does NOT queue or retry — use a job queue (e.g. Inngest / QStash)
 * for high-volume or scheduled sends in production.
 */
export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const toArray = Array.isArray(params.to) ? params.to : [params.to];

  try {
    const { data, error } = await getResendClient().emails.send({
      from: params.from ?? DEFAULT_FROM,
      to: toArray.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
      cc: params.cc?.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
      bcc: params.bcc?.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      tags: params.tags,
      scheduledAt: params.scheduledAt,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string"
          ? Buffer.from(a.content, "utf-8").toString("base64")
          : a.content.toString("base64"),
        content_type: a.contentType,
      })),
    });

    if (error) {
      console.error("[Resend] Send failed:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown email send error";
    console.error("[Resend] Unexpected error:", err);
    return { success: false, error: message };
  }
}

// ─── sendEmailBatch — Send to Multiple Recipients Individually ──────────────

/**
 * Send the same email to multiple recipients as individual messages.
 * Each recipient sees only their own address in the To: field.
 *
 * Returns per-recipient results so callers can track which sends
 * succeeded and which failed.
 */
export async function sendEmailBatch(
  params: Omit<SendEmailParams, "to"> & { to: EmailRecipient[] },
): Promise<{ recipient: EmailRecipient; result: SendEmailResult }[]> {
  const results = await Promise.allSettled(
    params.to.map(async (recipient) => {
      const result = await sendEmail({ ...params, to: recipient });
      return { recipient, result };
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { recipient: params.to[i], result: { success: false, error: "Promise rejected" } },
  );
}

// ─── Health Check ──────────────────────────────────────────────────────────

/**
 * Verify the Resend API key is valid and the account is active.
 * Returns true if the API responds without an auth error.
 */
export async function checkResendHealth(): Promise<boolean> {
  try {
    // Resend doesn't have a dedicated health endpoint, so we check
    // by attempting to retrieve the authenticated domain list.
    const { error } = await getResendClient().domains.list();
    return !error;
  } catch {
    return false;
  }
}

export { APP_URL, DEFAULT_FROM };
