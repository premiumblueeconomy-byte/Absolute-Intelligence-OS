import {
  authenticate,
  billingEnabled,
  stripeClient,
  siteUrl,
  cors,
  reply,
  failure,
  RequestError,
} from "../_shared/billing.ts";
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Use POST" }, 405);
  let release: (() => Promise<void>) | undefined;
  try {
    const { database, user, profile } = await authenticate(req, false);
    const body = await req.json();
    if (body.action === "status") return reply({ ready: billingEnabled() });
    if (profile.account_status !== "active")
      throw new RequestError("Your account is suspended.", 403);
    if (!billingEnabled())
      throw new RequestError("Paid subscriptions are not available yet.", 503);
    if (!["pro", "enterprise"].includes(body.plan))
      throw new RequestError("Choose an available plan.");
    const { data: plan, error: pe } = await database
      .from("billing_plans")
      .select("*")
      .eq("id", body.plan)
      .eq("enabled", true)
      .single();
    if (pe || !plan?.stripe_price_id)
      throw new RequestError("This plan is not available yet.");
    const stripe = stripeClient();
    const price = await stripe.prices.retrieve(plan.stripe_price_id);
    if (
      !price.active ||
      price.type !== "recurring" ||
      price.unit_amount !== plan.price_minor ||
      price.currency !== plan.currency ||
      price.recurring?.interval !== plan.billing_interval ||
      price.recurring?.interval_count !== 1 ||
      price.billing_scheme !== "per_unit"
    )
      throw new RequestError(
        "This plan is being updated. Please contact support.",
        503,
      );
    const { data: locked, error: le } = await database.rpc(
      "acquire_checkout_lock",
      { p_user: user.id },
    );
    if (le) throw le;
    if (!locked)
      throw new RequestError(
        "Another checkout is starting. Please wait a moment.",
        409,
      );
    release = async () => {
      const { error } = await database
        .from("subscriptions")
        .update({ checkout_lock_until: null })
        .eq("user_id", user.id);
      if (error) console.error("Checkout lease release failed");
    };
    const { data: sub, error: se } = await database
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (se) throw se;
    let customer = sub.stripe_customer_id;
    if (!customer) {
      const c = await stripe.customers.create(
        { email: user.email, metadata: { user_id: user.id } },
        { idempotencyKey: `aios-customer-${user.id}` },
      );
      customer = c.id;
      const { error } = await database
        .from("subscriptions")
        .update({ stripe_customer_id: customer })
        .eq("user_id", user.id);
      if (error) throw error;
    }
    const subscriptions = await stripe.subscriptions.list({
      customer,
      status: "all",
      limit: 100,
    });
    if (
      subscriptions.has_more ||
      subscriptions.data.some(
        (s) => !["canceled", "incomplete_expired"].includes(s.status),
      )
    ) {
      const portal = await stripe.billingPortal.sessions.create({
        customer,
        return_url: `${siteUrl()}/billing`,
      });
      return reply({ url: portal.url });
    }
    // Discover open sessions as well as the stored ID: recover a provider success followed by a database failure.
    const open = await stripe.checkout.sessions.list({
      customer,
      status: "open",
      limit: 100,
    });
    if (open.has_more)
      throw new RequestError(
        "Please contact support to complete your checkout.",
        409,
      );
    for (const old of open.data) {
      if (old.mode !== "subscription") continue;
      if (old.metadata?.price_id === price.id && old.url)
        return reply({ url: old.url });
      await stripe.checkout.sessions.expire(old.id);
    }
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer,
        line_items: [{ price: price.id, quantity: 1 }],
        client_reference_id: user.id,
        metadata: { user_id: user.id, plan: plan.id, price_id: price.id },
        subscription_data: { metadata: { user_id: user.id } },
        success_url: `${siteUrl()}/billing?checkout=success`,
        cancel_url: `${siteUrl()}/billing?checkout=canceled`,
      },
      {
        idempotencyKey: `aios-checkout-${user.id}-${price.id}-${crypto.randomUUID()}`,
      },
    );
    const { error } = await database
      .from("subscriptions")
      .update({
        checkout_session_id: session.id,
        checkout_expires_at: new Date(session.expires_at * 1000).toISOString(),
      })
      .eq("user_id", user.id);
    if (error) throw error;
    return reply({ url: session.url });
  } catch (e) {
    return failure(e);
  } finally {
    if (release) await release();
  }
});
