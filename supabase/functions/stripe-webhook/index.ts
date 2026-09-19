import { Stripe, db, stripeClient, reply } from "../_shared/billing.ts";
import { billingStatus, paidPlan } from "../_shared/billing-policy.ts";
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ error: "Use POST" }, 405);
  const signature = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature) return reply({ error: "Signature required" }, 400);
  if (!secret) return reply({ error: "Webhook not configured" }, 503);
  let event: Stripe.Event;
  let stripe: Stripe;
  try {
    stripe = stripeClient();
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return reply({ error: "Invalid webhook signature" }, 400);
  }
  try {
    const database = db();
    let subscriptionId: string | undefined;
    if (
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(event.type)
    )
      subscriptionId = (event.data.object as Stripe.Subscription).id;
    else if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
      ].includes(event.type)
    ) {
      const s = event.data.object as Stripe.Checkout.Session;
      subscriptionId =
        typeof s.subscription === "string"
          ? s.subscription
          : s.subscription?.id;
    } else return reply({ received: true });
    if (!subscriptionId) return reply({ received: true });
    // Fetch current provider state so delayed delivery cannot restore an obsolete paid status.
    const s = await stripe.subscriptions.retrieve(subscriptionId);
    const customer =
      typeof s.customer === "string" ? s.customer : s.customer.id;
    const { data: local, error: le } = await database
      .from("subscriptions")
      .select("user_id,stripe_customer_id")
      .eq("stripe_customer_id", customer)
      .maybeSingle();
    if (le) throw le;
    if (!local) return reply({ received: true, ignored: "Unmanaged customer" });
    if (s.metadata.user_id !== local.user_id)
      throw new Error("Subscription owner mismatch");
    const { data: mappings, error: me } = await database
      .from("billing_price_history")
      .select("price_id,plan_id");
    if (me) throw me;
    const plan = paidPlan(
      s.items.data.map((i) => i.price.id),
      mappings || [],
    );
    if (!plan)
      console.error(
        "Unmapped subscription price; denying paid entitlement",
        s.id,
      );
    const end = Math.min(...s.items.data.map((i) => i.current_period_end));
    if (!Number.isFinite(end)) throw new Error("Missing subscription period");
    const { error } = await database.rpc("apply_billing_event", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_created: event.created,
      p_user: local.user_id,
      p_customer: customer,
      p_subscription: s.id,
      p_plan: plan || "free",
      p_status: plan ? billingStatus(s.status) : "past_due",
      p_period_end: new Date(end * 1000).toISOString(),
      p_cancel: s.cancel_at_period_end,
    });
    if (error) throw error;
    return reply({ received: true });
  } catch (e) {
    console.error(
      "Billing reconciliation failed",
      e instanceof Error ? e.message : "Unknown error",
    );
    return reply({ error: "Unable to synchronize subscription" }, 500);
  }
});
