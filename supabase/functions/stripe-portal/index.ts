import {
  authenticate,
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
  try {
    const { database, user } = await authenticate(req, false);
    const { data, error } = await database
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();
    if (error) throw error;
    if (!data.stripe_customer_id)
      throw new RequestError("No paid billing account exists yet.");
    const session = await stripeClient().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${siteUrl()}/billing`,
    });
    return reply({ url: session.url });
  } catch (e) {
    return failure(e);
  }
});
