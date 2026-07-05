import { getSupabaseAdmin } from "./supabase/admin";

type NotificationInput = {
  userId: string;
  title: string;
  message?: string | null;
  link?: string | null;
};

export async function createNotification(input: NotificationInput) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("Notification").insert({
      userId: input.userId,
      title: input.title,
      message: input.message ?? null,
      link: input.link ?? null,
      read: false,
    });
  } catch (e) {
    console.error("Notification insert failed:", e);
  }
}

export function notificationFromAction(action: string, clientName?: string, clientId?: string): { title: string; message?: string; link?: string } {
  switch (action) {
    case "CLIENT_CREATED":
      return { title: "New client created", message: clientName, link: clientId ? `/clients/${clientId}` : undefined };
    case "DOCUMENT_UPLOADED":
      return { title: "Document uploaded", message: clientName, link: clientId ? `/clients/${clientId}` : undefined };
    case "AGREEMENT_SENT":
      return { title: "Agreement sent", message: clientName, link: clientId ? `/clients/${clientId}` : undefined };
    case "CLIENT_UPDATED":
      return { title: "Client updated", message: clientName, link: clientId ? `/clients/${clientId}` : undefined };
    default:
      return { title: action.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()), message: clientName };
  }
}
