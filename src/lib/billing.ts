import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Plan = Subscription["plan"];

export const PLAN_LABEL: Record<Plan, string> = { free: "Free", pro: "Pro", enterprise: "Enterprise" };

export async function getMySubscription(): Promise<Subscription | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.from("subscriptions").select("*").eq("user_id", auth.user.id).maybeSingle();
  if (error) throw error;
  return data;
}

interface CheckoutResponse {
  url?: string;
  error?: string;
}

/** Starts a Stripe Checkout session and returns the URL to redirect the browser to. Throws if Stripe isn't configured on this Supabase project. */
export async function startCheckout(plan: Exclude<Plan, "free">): Promise<string> {
  const { data, error } = await supabase.functions.invoke<CheckoutResponse>("stripe-checkout", { body: { plan } });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error ?? "Could not start checkout");
  return data.url;
}

/** Opens the Stripe Billing Portal for an existing customer to manage/cancel. */
export async function openBillingPortal(): Promise<string> {
  const { data, error } = await supabase.functions.invoke<CheckoutResponse>("stripe-portal", { body: {} });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error ?? "Could not open the billing portal");
  return data.url;
}
