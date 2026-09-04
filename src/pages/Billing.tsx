import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getMySubscription, startCheckout, openBillingPortal, PLAN_LABEL, type Subscription } from "@/lib/billing";
import { CreditCard, Check } from "lucide-react";

const PLANS: { id: "free" | "pro" | "enterprise"; price: string; blurb: string; features: string[] }[] = [
  { id: "free", price: "$0", blurb: "Explore the platform.", features: ["1 project", "Core intelligence modules", "Prompt Library"] },
  { id: "pro", price: "$—/mo", blurb: "For active builders.", features: ["Unlimited projects", "Semantic search", "Organizations & collaboration"] },
  { id: "enterprise", price: "Contact us", blurb: "For teams and institutions.", features: ["Everything in Pro", "Admin panel access", "Priority support"] },
];

export default function Billing() {
  const { ready } = useRequireAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    void getMySubscription().then(setSub).finally(() => setLoading(false));
  }, [ready]);

  const upgrade = async (plan: "pro" | "enterprise") => {
    setBusy(plan);
    try {
      const url = await startCheckout(plan);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setBusy(null);
    }
  };

  const manage = async () => {
    setBusy("manage");
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open billing portal");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-1">
          <CreditCard className="w-5 h-5 text-accent" /> Billing
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Upgrading requires the site operator to have connected a real Stripe account (secrets +
          products/prices) — if that isn't done yet, upgrading will say so rather than pretending
          to charge you.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : (
          <>
            {sub && (
              <Card className="p-4 mb-6 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Current plan</div>
                  <div className="text-lg font-black flex items-center gap-2">
                    {PLAN_LABEL[sub.plan]} <Badge variant="outline">{sub.status}</Badge>
                  </div>
                </div>
                {sub.stripe_customer_id && (
                  <Button variant="outline" size="sm" onClick={manage} disabled={busy === "manage"}>
                    Manage billing
                  </Button>
                )}
              </Card>
            )}

            <div className="grid md:grid-cols-3 gap-3">
              {PLANS.map((p) => (
                <Card key={p.id} className={`p-4 space-y-3 ${sub?.plan === p.id ? "border-accent" : ""}`}>
                  <div>
                    <div className="text-sm font-bold">{PLAN_LABEL[p.id]}</div>
                    <div className="text-xl font-black">{p.price}</div>
                    <p className="text-xs text-muted-foreground mt-1">{p.blurb}</p>
                  </div>
                  <ul className="space-y-1">
                    {p.features.map((f) => (
                      <li key={f} className="text-xs flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-accent shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  {p.id !== "free" && sub?.plan !== p.id && (
                    <Button size="sm" className="w-full" onClick={() => upgrade(p.id as "pro" | "enterprise")} disabled={busy === p.id}>
                      {busy === p.id ? "Starting checkout…" : `Upgrade to ${PLAN_LABEL[p.id]}`}
                    </Button>
                  )}
                  {sub?.plan === p.id && <Badge variant="outline" className="w-full justify-center">Current plan</Badge>}
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
