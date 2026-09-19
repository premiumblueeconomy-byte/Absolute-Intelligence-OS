export function billingStatus(
  status: string,
): "active" | "trialing" | "past_due" | "canceled" {
  if (status === "active" || status === "trialing") return status;
  if (status === "canceled" || status === "incomplete_expired")
    return "canceled";
  return "past_due";
}
export function paidPlan(
  priceIds: string[],
  mappings: { price_id: string; plan_id: string }[],
): string | null {
  if (priceIds.length !== 1) return null;
  return mappings.find((m) => m.price_id === priceIds[0])?.plan_id ?? null;
}
