import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { BillingPlan, Controls } from "./admin-console";
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Plan = Subscription["plan"];
export const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};
export interface BillingSummary {
  plans: BillingPlan[];
  controls: Controls;
  effective_plan: Plan;
  month_runs: number;
  projects: number;
}
export async function getBillingSummary(): Promise<BillingSummary> {
  const { data, error } = await supabase.rpc("billing_summary");
  if (error) throw new Error(error.message);
  return data as unknown as BillingSummary;
}
export async function getMySubscription(): Promise<Subscription | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: body as Record<string, unknown>,
  });
  if (error) {
    let msg =
      "Billing is temporarily unavailable. Please try again or contact support.";
    if (error.context instanceof Response) {
      try {
        msg = (await error.context.json()).error || msg;
      } catch {
        /* Fall back to safe message. */
      }
    }
    throw new Error(msg);
  }
  return data as T;
}
export async function billingReady() {
  return invoke<{ ready: boolean }>("stripe-checkout", { action: "status" });
}
export async function startCheckout(plan: Exclude<Plan, "free">) {
  const data = await invoke<{ url?: string }>("stripe-checkout", { plan });
  if (!data.url) throw new Error("Could not start checkout.");
  return data.url;
}
export async function openBillingPortal() {
  const data = await invoke<{ url?: string }>("stripe-portal", {});
  if (!data.url) throw new Error("Could not open billing.");
  return data.url;
}
export function formatPrice(p: BillingPlan) {
  if (p.price_minor === null) return "Coming soon";
  try {
    const f = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: p.currency,
    });
    const digits = f.resolvedOptions().maximumFractionDigits ?? 2;
    return f.format(p.price_minor / 10 ** digits);
  } catch {
    return `${p.price_minor} ${p.currency.toUpperCase()} (minor units)`;
  }
}
