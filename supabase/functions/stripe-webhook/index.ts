// Billing/subscriptions (Phase 3/4). Receives Stripe's webhook events and
// keeps public.subscriptions in sync. Stripe calls this directly — there is
// no Supabase user session on the request — so this is the one edge
// function in this project that uses the service-role key, and it must
// have verify_jwt disabled (see supabase/config.toml) since Stripe cannot
// send a Supabase JWT.
//
// Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET (from the webhook's
// own settings page in the Stripe dashboard, after registering
// https://<project>.supabase.co/functions/v1/stripe-webhook as the
// endpoint) — with either missing, this returns a clear 500 instead of
// silently accepting unverified events.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function mapStripeStatus(s: string): "active" | "trialing" | "past_due" | "canceled" {
  if (s === "trialing") return "trialing";
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "canceled" || s === "incomplete_expired") return "canceled";
  return "active";
}

function planFromPriceId(priceId: string | undefined): "pro" | "enterprise" | "free" {
  if (priceId && priceId === Deno.env.get("STRIPE_PRICE_PRO")) return "pro";
  if (priceId && priceId === Deno.env.get("STRIPE_PRICE_ENTERPRISE")) return "enterprise";
  return "free";
}

serve(async (req) => {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      return json({ error: "STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are not configured on this Supabase project" }, 500);
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) return json({ error: "Missing stripe-signature header" }, 400);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } catch (err) {
      return json({ error: `Invalid signature: ${err instanceof Error ? err.message : "unknown"}` }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        if (userId && session.customer) {
          await supabase.from("subscriptions").update({
            stripe_customer_id: String(session.customer),
            stripe_subscription_id: session.subscription ? String(session.subscription) : null,
            status: "active",
          }).eq("user_id", userId);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const deleted = event.type === "customer.subscription.deleted";
        await supabase.from("subscriptions").update({
          plan: deleted ? "free" : planFromPriceId(subscription.items.data[0]?.price?.id),
          status: deleted ? "canceled" : mapStripeStatus(subscription.status),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }).eq("stripe_customer_id", String(subscription.customer));
        break;
      }
      default:
        break;
    }

    return json({ received: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
