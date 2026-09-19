import { describe, it, expect } from "vitest";
import {
  billingStatus,
  paidPlan,
} from "../../supabase/functions/_shared/billing-policy";
describe("subscription entitlements", () => {
  it.each(["past_due", "unpaid", "incomplete", "paused", "unknown"])(
    "does not grant paid access for %s",
    (s) => expect(billingStatus(s)).toBe("past_due"),
  );
  it.each(["canceled", "incomplete_expired"])("revokes access for %s", (s) =>
    expect(billingStatus(s)).toBe("canceled"),
  );
  it.each(["active", "trialing"])("preserves entitled status %s", (s) =>
    expect(billingStatus(s)).toBe(s),
  );
  it("rejects unknown or multiple recurring items", () => {
    expect(paidPlan(["price_unknown"], [])).toBeNull();
    expect(
      paidPlan(["a", "b"], [{ price_id: "a", plan_id: "pro" }]),
    ).toBeNull();
  });
  it("recognizes historical prices for existing subscriptions", () =>
    expect(
      paidPlan(
        ["price_old"],
        [
          { price_id: "price_old", plan_id: "pro" },
          { price_id: "price_new", plan_id: "pro" },
        ],
      ),
    ).toBe("pro"));
});
