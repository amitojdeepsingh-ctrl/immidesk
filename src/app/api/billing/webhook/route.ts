import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Stripe webhook — keeps the Subscription table in sync.
 * Configure endpoint: https://<domain>/api/billing/webhook
 * Events: checkout.session.completed, customer.subscription.updated,
 *         customer.subscription.deleted
 */
export async function POST(req: NextRequest) {
  const secret = process.env["STRIPE_SECRET_KEY"];
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 501 });
  }

  const stripe = new Stripe(secret);
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId =
          (session.metadata?.organizationId as string) ?? (session.client_reference_id as string);
        if (!organizationId || !session.subscription || !session.customer) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const item = sub.items.data.find((i) => i.current_period_end != null) ?? sub.items.data[0];
        await db
          .from("Subscription")
          .upsert(
            {
              organizationId,
              stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer.id,
              stripeSubscriptionId: sub.id,
              planTier: (session.metadata?.planTier as string) ?? "SOLO",
              status: mapStatus(sub.status),
              currentPeriodStart: item?.current_period_start
                ? new Date(item.current_period_start * 1000).toISOString()
                : null,
              currentPeriodEnd: item?.current_period_end
                ? new Date(item.current_period_end * 1000).toISOString()
                : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              updatedAt: new Date().toISOString(),
            },
            { onConflict: "organizationId" },
          );
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const item = sub.items.data[0];
        const organizationId = sub.metadata?.organizationId as string | undefined;
        const query = db.from("Subscription").update({
          status: event.type === "customer.subscription.deleted" ? "CANCELED" : mapStatus(sub.status),
          currentPeriodStart: item?.current_period_start
            ? new Date(item.current_period_start * 1000).toISOString()
            : null,
          currentPeriodEnd: item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          planTier: (sub.metadata?.planTier as string) ?? undefined,
          updatedAt: new Date().toISOString(),
        });
        if (organizationId) query.eq("organizationId", organizationId);
        else if (typeof sub.id === "string") query.eq("stripeSubscriptionId", sub.id);
        else break;
        await query;
        break;
      }

      default:
        // Unhandled event types are acknowledged silently
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function mapStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case "trialing": return "TRIALING";
    case "active": return "ACTIVE";
    case "past_due": return "PAST_DUE";
    case "canceled": return "CANCELED";
    case "unpaid": return "UNPAID";
    default: return "TRIALING";
  }
}

export const runtime = "nodejs";
