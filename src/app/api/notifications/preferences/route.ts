import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const eventEnum = z.enum([
  "TASK_OVERDUE", "TASK_DUE_TOMORROW", "TASK_ASSIGNED",
  "CASE_STATUS_CHANGED", "DOCUMENT_UPLOADED", "DOCUMENT_EXPIRING",
  "RETAINER_SIGNED", "PROSPECT_ASSIGNED", "FOLLOW_UP_REACHED",
  "INVOICE_OVERDUE", "PAYMENT_RECEIVED",
  "CONSULTATION_BOOKED", "CONSULTATION_REMINDER",
]);

const upsertSchema = z.object({
  event: eventEnum,
  email: z.boolean(),
  inApp: z.boolean(),
});

export async function GET() {
  try {
    const { prismaUser } = await requireAuth();
    const { data: prefs, error } = await getSupabaseAdmin()
      .from("NotificationPreference")
      .select("*")
      .eq("userId", prismaUser.id)
      .order("event", { ascending: true });

    if (error) throw new AppError("QUERY_FAILED", error.message, 500);
    return successResponse(prefs ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { prismaUser } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const parsed = upsertSchema.parse(body);

    const { data: existing } = await supabase
      .from("NotificationPreference")
      .select("id")
      .eq("userId", prismaUser.id)
      .eq("event", parsed.event)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("NotificationPreference")
        .update({ email: parsed.email, inApp: parsed.inApp })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new AppError("UPDATE_FAILED", error.message, 500);
      return successResponse(data);
    }

    const { data, error } = await supabase
      .from("NotificationPreference")
      .insert({
        userId: prismaUser.id,
        event: parsed.event,
        email: parsed.email,
        inApp: parsed.inApp,
      })
      .select()
      .single();
    if (error) throw new AppError("INSERT_FAILED", error.message, 500);
    return successResponse(data, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
