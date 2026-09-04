// Billing/subscriptions (Phase 3/4). Creates a Stripe Checkout session for
// the caller to upgrade to a paid plan. Requires STRIPE_SECRET_KEY and
// STRIPE_PRICE_PRO / STRIPE_PRICE_ENTERPRISE secrets — with none set, this
// returns a clear 500 rather than a broken checkout link.
//
// Unlike ask-absolute/embed-text, this function needs to know who the
// caller is (to attach the subscription to the right user), so it builds a
// Supabase client scoped to the caller's own JWT (forwarded from the
// Authorization header) and calls auth.getUser() — the standard pattern for
// identifying a caller inside an edge function without a service-role key.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

interface RequestBody {
  plan?: "pro" | "enterprise";
}

const PRICE_ENV: Record<string, string> = { pro: "STRIPE_PRICE_PRO", enterprise: "STRIPE_PRICE_ENTERPRISE" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) return json({ error: "Not signed in" }, 401);

    const body = (await req.json()) as RequestBody;
    if (!body.plan || !PRICE_ENV[body.plan]) return json({ error: "plan must be 'pro' or 'enterprise'" }, 400);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "STRIPE_SECRET_KEY is not configured on this Supabase project" }, 500);
    const priceId = Deno.env.get(PRICE_ENV[body.plan]);
    if (!priceId) return json({ error: `${PRICE_ENV[body.plan]} is not configured on this Supabase project` }, 500);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: sub?.stripe_customer_id || undefined,
      customer_email: sub?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/billing?checkout=success`,
      cancel_url: `${siteUrl}/billing?checkout=cancelled`,
      metadata: { user_id: user.id },
    });

    return json({ url: session.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
