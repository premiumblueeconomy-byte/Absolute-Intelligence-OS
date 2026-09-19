import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBillingSummary,
  getMySubscription,
  billingReady,
  startCheckout,
  openBillingPortal,
  formatPrice,
  type Subscription,
  type BillingSummary,
} from "@/lib/billing";
import { toast } from "sonner";
export default function Billing() {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!user) return;
    let current = true;
    setError("");
    void Promise.all([
      getBillingSummary(),
      getMySubscription(),
      billingReady().catch(() => ({ ready: false })),
    ])
      .then(([s, b, r]) => {
        if (current) {
          setSummary(s);
          setSub(b);
          setReady(r.ready);
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [user, revision]);
  async function go(plan?: "pro" | "enterprise") {
    setBusy(true);
    try {
      window.location.assign(
        plan ? await startCheckout(plan) : await openBillingPortal(),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to open billing.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Plans & billing</h1>
          <p className="text-muted-foreground mt-2">
            Choose the capacity that fits your work. Manage your subscription at
            any time.
          </p>
        </div>
        {error ? (
          <Card role="alert" className="p-5">
            <p>{error}</p>
            <Button onClick={() => setRevision((r) => r + 1)}>Retry</Button>
          </Card>
        ) : !summary ? (
          <p role="status">Loading billing…</p>
        ) : (
          <>
            <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current access</p>
                <h2 className="text-xl font-bold">
                  {summary.plans.find((p) => p.id === summary.effective_plan)
                    ?.name || "Free"}
                </h2>
                <p className="text-sm">
                  {summary.projects} projects · {summary.month_runs} AI runs
                  this month
                </p>
                {sub?.plan !== "free" && (
                  <p className="text-sm mt-2">
                    Subscription: {sub?.status.replaceAll("_", " ")}
                    {sub?.current_period_end
                      ? ` · ${sub.cancel_at_period_end ? "Ends" : "Current period ends"} ${new Date(sub.current_period_end).toLocaleDateString()}`
                      : ""}
                  </p>
                )}
              </div>
              {sub?.stripe_customer_id && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void go()}
                >
                  Manage or cancel subscription
                </Button>
              )}
            </Card>
            {profile?.account_status === "suspended" && (
              <p role="alert">
                Your account is suspended. You can still manage or cancel an
                existing subscription.
              </p>
            )}
            {!ready && (
              <p className="text-sm text-muted-foreground">
                Paid subscriptions are not available yet. Your current access
                remains available.
              </p>
            )}
            <div className="grid md:grid-cols-3 gap-5">
              {summary.plans.map((p) => (
                <Card
                  key={p.id}
                  className={`p-6 space-y-4 ${p.id === summary.effective_plan ? "border-teal-500 border-2" : ""}`}
                >
                  <h2 className="font-bold text-xl">{p.name}</h2>
                  <p className="text-3xl font-bold">
                    {formatPrice(p)}
                    {p.id !== "free" && p.price_minor !== null && (
                      <span className="text-sm font-normal">
                        {" "}
                        / {p.billing_interval}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {p.description}
                  </p>
                  <ul className="text-sm space-y-2">
                    <li>
                      {p.max_projects === null ? "Unlimited" : p.max_projects}{" "}
                      projects
                    </li>
                    <li>
                      {p.monthly_runs === null ? "Unlimited" : p.monthly_runs}{" "}
                      AI runs per calendar month
                    </li>
                    <li>Prompt library and downloadable reports</li>
                  </ul>
                  {p.id === summary.effective_plan ? (
                    <p className="font-medium text-teal-500">Current plan</p>
                  ) : p.id !== "free" ? (
                    <Button
                      className="w-full"
                      disabled={
                        busy ||
                        !ready ||
                        !p.enabled ||
                        profile?.account_status === "suspended"
                      }
                      onClick={() => void go(p.id as "pro" | "enterprise")}
                    >
                      {!p.enabled ? "Coming soon" : `Choose ${p.name}`}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Cancel a paid subscription in Manage billing to return to
                      Free.
                    </p>
                  )}
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Usage resets on the first day of each month (UTC). Failed
              generations do not count. Successful payment is confirmed before
              paid access is enabled.
            </p>
            {summary.controls.support_email && (
              <p className="text-sm">
                Need help?{" "}
                <a
                  className="underline"
                  href={`mailto:${summary.controls.support_email}`}
                >
                  {summary.controls.support_email}
                </a>
              </p>
            )}
            <Button variant="outline" onClick={() => setRevision((r) => r + 1)}>
              Refresh subscription status
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
