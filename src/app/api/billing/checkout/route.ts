import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const bodySchema = z.object({
  planTier: z.enum(["SOLO", "TEAM", "FIRM"]),
});

const PRICE_ENV: Record<string, string | undefined> = {
  SOLO: process.env["STRIPE_SOLO_PRICE_ID_USD"],
  TEAM: process.env["STRIPE_TEAM_PRICE_ID_USD"],
  FIRM: process.env["STRIPE_FIRM_PRICE_ID_USD"],
};

export async function POST(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const { planTier } = bodySchema.parse(await req.json());

    const secret = process.env["STRIPE_SECRET_KEY"];
    const priceId = PRICE_ENV[planTier];
    if (!secret || !priceId) {
      return NextResponse.json(
        { error: "Billing is not configured yet. Set STRIPE_SECRET_KEY and the plan price IDs." },
        { status: 501 },
      );
    }

    const stripe = new Stripe(secret);
    const db = getSupabaseAdmin();

    // Existing subscription row → reuse customer
    const { data: sub } = await db
      .from("Subscription")
      .select("id, stripeCustomerId")
      .eq("organizationId", organization.id)
      .maybeSingle();

    let customerId = sub?.stripeCustomerId ?? null;
    if (!customerId) {
      // Look up org owner email for the customer record
      const { data: owner } = await db
        .from("User")
        .select("email, name")
        .eq("organizationId", organization.id)
        .in("role", ["OWNER", "ADMIN"])
        .order("createdAt", { ascending: true })
        .limit(1)
        .maybeSingle();

      const customer = await stripe.customers.create({
        name: organization.name,
        email: owner?.email,
        metadata: { organizationId: organization.id },
      });
      customerId = customer.id;

      if (sub?.id) {
        await db.from("Subscription").update({ stripeCustomerId: customerId }).eq("id", sub.id);
      } else {
        await db.from("Subscription").insert({
          id: crypto.randomUUID(),
          organizationId: organization.id,
          stripeCustomerId: customerId,
          planTier,
          status: "TRIALING",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: organization.id,
      metadata: { organizationId: organization.id, planTier },
      subscription_data: { metadata: { organizationId: organization.id, planTier } },
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/billing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid plan tier" }, { status: 422 });
    }
    console.error("billing/checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
