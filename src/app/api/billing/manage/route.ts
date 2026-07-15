import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api/errors";

export async function POST() {
  try {
    await requireAuth();

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      return successResponse({
        url: null,
        message: "Billing portal is not configured. Please set STRIPE_SECRET_KEY to enable self-service billing management.",
      });
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24-acacia" as never });

    const session = await stripe.billingPortal.sessions.create({
      customer: "placeholder_customer_id",
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings/billing`,
    });

    return successResponse({ url: session.url });
  } catch (err) {
    return handleApiError(err);
  }
}
