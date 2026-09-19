import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2.115.0";
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const db = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
export const billingEnabled = () =>
  Boolean(
    Deno.env.get("STRIPE_SECRET_KEY") &&
      Deno.env.get("STRIPE_WEBHOOK_SECRET") &&
      Deno.env.get("BILLING_ENABLED") === "true",
  );
export function stripeClient() {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key)
    throw new RequestError("Paid subscriptions are not available yet.", 503);
  return new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
    timeout: 15000,
  });
}
export function siteUrl() {
  const site =
    Deno.env.get("SITE_URL") || "https://absolute-intelligence-os.vercel.app";
  const u = new URL(site);
  if (u.protocol !== "https:") throw new Error("SITE_URL must use HTTPS");
  return u.origin;
}
export async function authenticate(req: Request, active = true) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer "))
    throw new RequestError("Please sign in.", 401);
  const database = db();
  const { data, error } = await database.auth.getUser(auth.slice(7));
  if (error || !data.user)
    throw new RequestError("Your session expired. Please sign in again.", 401);
  const { data: profile, error: pe } = await database
    .from("profiles")
    .select("account_status,is_platform_admin")
    .eq("id", data.user.id)
    .single();
  if (pe) throw pe;
  if (active && profile.account_status !== "active")
    throw new RequestError(
      "Your account is suspended. Existing billing can still be managed.",
      403,
    );
  return { database, user: data.user, profile };
}
export function failure(e: unknown) {
  console.error(e instanceof Error ? e.name : "Billing error");
  return reply(
    {
      error:
        e instanceof RequestError
          ? e.message
          : "Billing is temporarily unavailable. Please try again or contact support.",
    },
    e instanceof RequestError ? e.status : 503,
  );
}
export { Stripe };
