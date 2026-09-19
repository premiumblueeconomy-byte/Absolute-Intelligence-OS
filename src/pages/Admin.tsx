import { useEffect, useState, type ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminCall,
  type AdminUser,
  type AdminPrompt,
  type AuditEntry,
  type BillingPlan,
  type Controls,
  type Page,
} from "@/lib/admin-console";
import {
  listOrganizationsAdmin,
  listRecentProjectsAdmin,
  type AdminOrganization,
  type AdminProject,
} from "@/lib/admin";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
const tabs = [
  "Overview",
  "Users",
  "Plans",
  "Platform",
  "Prompts",
  "Workspaces",
  "Activity",
] as const;
type Tab = (typeof tabs)[number];
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Unable to complete the request.";
export default function Admin() {
  const { profile, user } = useAuth();
  const [tab, setTab] = useState<Tab>("Overview");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<Page<AdminUser>>({ items: [], total: 0 });
  const [prompts, setPrompts] = useState<Page<AdminPrompt>>({
    items: [],
    total: 0,
  });
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [controls, setControls] = useState<Controls>({
    generation_enabled: true,
    announcement: "",
    support_email: "",
  });
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [workspaces, setWorkspaces] = useState<{
    orgs: AdminOrganization[];
    projects: AdminProject[];
  }>({ orgs: [], projects: [] });
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [prompt, setPrompt] = useState<AdminPrompt | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!profile?.is_platform_admin) return;
    let current = true;
    setLoading(true);
    setError("");
    const run = async () => {
      if (tab === "Overview") {
        const r = await adminCall<Record<string, number>>("overview");
        if (current) setStats(r);
      }
      if (tab === "Users") {
        const r = await adminCall<Page<AdminUser>>("users", {
          search: query,
          offset,
        });
        if (current) setUsers(r);
      }
      if (tab === "Prompts") {
        const r = await adminCall<Page<AdminPrompt>>("prompts", {
          search: query,
          offset,
        });
        if (current) setPrompts(r);
      }
      if (tab === "Plans" || tab === "Platform") {
        const r = await adminCall<{ plans: BillingPlan[]; controls: Controls }>(
          "configuration",
        );
        if (current) {
          setPlans(r.plans);
          setControls(r.controls);
        }
      }
      if (tab === "Activity") {
        const r = await adminCall<{ items: AuditEntry[] }>("audit", { offset });
        if (current) setAudit(r.items);
      }
      if (tab === "Workspaces") {
        const [orgs, projects] = await Promise.all([
          listOrganizationsAdmin(),
          listRecentProjectsAdmin(100),
        ]);
        if (current) setWorkspaces({ orgs, projects });
      }
    };
    void run()
      .catch((e) => {
        if (current) setError(message(e));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [tab, query, offset, revision, profile?.is_platform_admin]);
  async function save(action: string, payload: unknown) {
    setBusy(true);
    try {
      await adminCall(action, payload);
      toast.success("Changes saved");
      setSelected(null);
      setPrompt(null);
      setRevision((r) => r + 1);
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  const total = tab === "Users" ? users.total : prompts.total;
  if (!profile?.is_platform_admin)
    return <p className="p-8">Administrator access required.</p>;
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-950 to-teal-900 text-white p-7">
          <div className="flex items-center gap-3">
            <ShieldCheck />
            <h1 className="text-3xl font-bold">Admin console</h1>
          </div>
          <p className="mt-2 text-white/75">
            Manage access, subscriptions, intelligence, and platform activity.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Administration"
        >
          {tabs.map((t) => (
            <Button
              role="tab"
              aria-selected={t === tab}
              key={t}
              variant={tab === t ? "default" : "outline"}
              onClick={() => {
                setTab(t);
                setSearch("");
                setQuery("");
                setOffset(0);
              }}
            >
              {t}
            </Button>
          ))}
        </div>
        {(tab === "Users" || tab === "Prompts") && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search);
              setOffset(0);
            }}
          >
            <Input
              aria-label={
                tab === "Users"
                  ? "Search users by name or email"
                  : "Search prompts or number"
              }
              placeholder={
                tab === "Users"
                  ? "Search name or email"
                  : "Search prompts or number"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button>Search</Button>
          </form>
        )}
        {error ? (
          <Card role="alert" className="p-6 space-y-3">
            <p>{error}</p>
            <Button onClick={() => setRevision((r) => r + 1)}>Retry</Button>
          </Card>
        ) : loading ? (
          <p role="status">Loading {tab.toLowerCase()}…</p>
        ) : (
          <>
            {tab === "Overview" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(stats).map(([k, v]) => (
                    <Card key={k} className="p-5 border-t-4 border-t-teal-500">
                      <p className="text-sm capitalize text-muted-foreground">
                        {k.replaceAll("_", " ")}
                      </p>
                      <p className="text-3xl font-bold mt-2">
                        {v.toLocaleString()}
                      </p>
                    </Card>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  AI usage tracking begins when this console is activated.
                  Monthly usage resets on the first day of each calendar month
                  (UTC).
                </p>
              </>
            )}
            {tab === "Users" && (
              <div className="space-y-3">
                {users.items.length === 0 && <p>No matching users.</p>}
                {users.items.map((u) => (
                  <Card
                    key={u.id}
                    className="p-4 flex flex-wrap justify-between gap-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {u.full_name || "Unnamed user"}{" "}
                        {u.is_platform_admin && (
                          <span className="text-xs text-teal-500">
                            Administrator
                          </span>
                        )}
                      </p>
                      <p className="text-sm break-all">{u.email}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {u.account_status} · {u.plan} ({u.subscription_status})
                        · {u.project_count} projects · {u.month_runs} runs this
                        month
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={u.id === user?.id}
                      onClick={() => {
                        setSelected({ ...u });
                        setConfirmed(false);
                      }}
                    >
                      {u.id === user?.id ? "Your account" : "Manage access"}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
            {tab === "Plans" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Set prices and usage limits. Empty limits mean unlimited. Plan
                  limits apply immediately; changing a price affects new
                  checkouts. Existing subscriptions retain their provider price.
                  Administrator access is never included in a paid plan.
                </p>
                <div className="grid lg:grid-cols-3 gap-4">
                  {plans.map((p, i) => (
                    <PlanEditor
                      key={p.id + revision}
                      plan={p}
                      busy={busy}
                      onSave={(v) => void save("save_plan", v)}
                    />
                  ))}
                </div>
                <Card className="p-4 text-sm">
                  Payment setup: connect your Stripe account and signed webhook
                  in Supabase, then enter matching recurring Price IDs above.
                  Paid plans start disabled. No charges occur when saving
                  settings.
                </Card>
              </>
            )}
            {tab === "Platform" && (
              <Card className="p-6 space-y-5 max-w-2xl">
                <h2 className="font-bold text-xl">Platform controls</h2>
                <Check
                  label="Allow AI generation"
                  checked={controls.generation_enabled}
                  onChange={(v) =>
                    setControls({ ...controls, generation_enabled: v })
                  }
                />
                <Field label="Announcement">
                  <Textarea
                    value={controls.announcement}
                    maxLength={1000}
                    onChange={(e) =>
                      setControls({ ...controls, announcement: e.target.value })
                    }
                  />
                </Field>
                <Field label="Support email">
                  <Input
                    type="email"
                    value={controls.support_email}
                    onChange={(e) =>
                      setControls({
                        ...controls,
                        support_email: e.target.value,
                      })
                    }
                  />
                </Field>
                <p className="text-sm text-muted-foreground">
                  Pausing generation blocks new runs. Runs already in progress
                  may finish.
                </p>
                <Button
                  disabled={busy}
                  onClick={() => void save("save_controls", controls)}
                >
                  Save platform settings
                </Button>
              </Card>
            )}
            {tab === "Prompts" && (
              <div className="space-y-3">
                {prompts.items.length === 0 && <p>No matching prompts.</p>}
                {prompts.items.map((p) => (
                  <Card className="p-4 flex gap-4 justify-between" key={p.id}>
                    <div className="min-w-0">
                      <p className="font-semibold">
                        #{p.prompt_number} · {p.category} ·{" "}
                        {p.is_active ? "Published" : "Hidden"}
                      </p>
                      <p className="line-clamp-2 text-sm text-muted-foreground mt-2">
                        {p.template}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setPrompt({ ...p })}
                    >
                      Edit
                    </Button>
                  </Card>
                ))}
              </div>
            )}
            {tab === "Workspaces" && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-5">
                  <h2 className="font-bold mb-4">Organizations</h2>
                  {workspaces.orgs.length === 0 && <p>None yet.</p>}
                  {workspaces.orgs.map((o) => (
                    <div key={o.id} className="border-t py-3">
                      <b>{o.name}</b>
                      <p className="text-sm">
                        {o.org_type.replaceAll("_", " ")} · {o.member_count}{" "}
                        members
                      </p>
                    </div>
                  ))}
                </Card>
                <Card className="p-5">
                  <h2 className="font-bold mb-4">Recent projects</h2>
                  {workspaces.projects.map((p) => (
                    <div key={p.id} className="border-t py-3">
                      <b>{p.title}</b>
                      <p className="text-sm">
                        {p.industry} · {p.location_country} · {p.status}
                      </p>
                    </div>
                  ))}
                </Card>
              </div>
            )}
            {tab === "Activity" && (
              <div className="space-y-3">
                {audit.length === 0 && <p>No activity on this page.</p>}
                {audit.map((a) => (
                  <Card key={a.id} className="p-4">
                    <p className="font-semibold capitalize">
                      {a.action.replaceAll("_", " ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.actor_name || "System"} ·{" "}
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer">
                        View change details
                      </summary>
                      <pre className="whitespace-pre-wrap break-all mt-3 text-xs">
                        {JSON.stringify(a.details, null, 2)}
                      </pre>
                    </details>
                  </Card>
                ))}
              </div>
            )}
            {(tab === "Users" || tab === "Prompts" || tab === "Activity") && (
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={offset === 0}
                  onClick={() =>
                    setOffset(
                      Math.max(0, offset - (tab === "Activity" ? 50 : 25)),
                    )
                  }
                >
                  Previous
                </Button>
                <span className="text-sm">
                  {tab === "Activity"
                    ? `Page ${offset / 50 + 1}`
                    : `${total ? offset + 1 : 0}–${Math.min(offset + 25, total)} of ${total}`}
                </span>
                <Button
                  variant="outline"
                  disabled={
                    tab === "Activity"
                      ? audit.length < 50
                      : offset + 25 >= total
                  }
                  onClick={() =>
                    setOffset(offset + (tab === "Activity" ? 50 : 25))
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v && !busy) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage account access</DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Field label="Account status">
                <select
                  className="w-full border rounded-md bg-background p-2"
                  value={selected.account_status}
                  onChange={(e) => {
                    setConfirmed(false);
                    setSelected({
                      ...selected,
                      account_status: e.target
                        .value as AdminUser["account_status"],
                    });
                  }}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </Field>
              <Check
                label="Platform administrator"
                checked={selected.is_platform_admin}
                onChange={(v) => {
                  setConfirmed(false);
                  setSelected({ ...selected, is_platform_admin: v });
                }}
              />
              {selected.account_status === "suspended" && (
                <Field label="Reason shown to the user">
                  <Textarea
                    value={selected.suspension_reason}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        suspension_reason: e.target.value,
                      })
                    }
                  />
                </Field>
              )}
              <p className="text-sm">
                Administrators can manage all users and settings. Suspension
                blocks app access immediately but does not cancel billing.
              </p>
              <Check
                label="I confirm this account access change"
                checked={confirmed}
                onChange={setConfirmed}
              />
              <Button
                disabled={
                  busy ||
                  !confirmed ||
                  (selected.account_status === "suspended" &&
                    selected.suspension_reason.trim().length < 5)
                }
                onClick={() =>
                  void save("update_user", {
                    id: selected.id,
                    account_status: selected.account_status,
                    is_platform_admin: selected.is_platform_admin,
                    reason: selected.suspension_reason,
                  })
                }
              >
                Save access
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!prompt}
        onOpenChange={(v) => {
          if (!v && !busy) setPrompt(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit prompt #{prompt?.prompt_number}</DialogTitle>
            <DialogDescription>
              Published prompts appear in the prompt library.
            </DialogDescription>
          </DialogHeader>
          {prompt && (
            <div className="space-y-4">
              <Field label="Category">
                <Input
                  value={prompt.category}
                  onChange={(e) =>
                    setPrompt({ ...prompt, category: e.target.value })
                  }
                />
              </Field>
              <Field label="Prompt">
                <Textarea
                  className="min-h-64"
                  value={prompt.template}
                  maxLength={20000}
                  onChange={(e) =>
                    setPrompt({ ...prompt, template: e.target.value })
                  }
                />
              </Field>
              <Check
                label="Published"
                checked={prompt.is_active}
                onChange={(v) => setPrompt({ ...prompt, is_active: v })}
              />
              <Button
                disabled={
                  busy ||
                  prompt.template.trim().length < 10 ||
                  !prompt.category.trim()
                }
                onClick={() => void save("save_prompt", prompt)}
              >
                Save prompt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex gap-3 items-center text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
function PlanEditor({
  plan,
  busy,
  onSave,
}: {
  plan: BillingPlan;
  busy: boolean;
  onSave: (v: BillingPlan) => void;
}) {
  const [p, setP] = useState(plan);
  const [price, setPrice] = useState(
    plan.price_minor === null ? "" : String(plan.price_minor),
  );
  return (
    <Card className="p-5">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...p, price_minor: price === "" ? null : Number(price) });
        }}
      >
        <h2 className="font-bold text-xl capitalize">{p.id}</h2>
        <Field label="Plan name">
          <Input
            required
            maxLength={80}
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={p.description}
            onChange={(e) => setP({ ...p, description: e.target.value })}
          />
        </Field>
        <Field label="Price in smallest currency unit (e.g. 2500 = USD 25)">
          <Input
            type="number"
            min="0"
            step="1"
            value={price}
            disabled={p.id === "free"}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="Currency code">
          <Input
            required
            pattern="[A-Za-z]{3}"
            maxLength={3}
            value={p.currency}
            onChange={(e) =>
              setP({ ...p, currency: e.target.value.toLowerCase() })
            }
          />
        </Field>
        <Field label="Billing interval">
          <select
            className="w-full border rounded-md bg-background p-2"
            value={p.billing_interval}
            onChange={(e) =>
              setP({
                ...p,
                billing_interval: e.target.value as "month" | "year",
              })
            }
          >
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </Field>
        {p.id !== "free" && (
          <>
            <Field label="Stripe recurring Price ID">
              <Input
                placeholder="price_…"
                value={p.stripe_price_id || ""}
                onChange={(e) =>
                  setP({ ...p, stripe_price_id: e.target.value })
                }
              />
            </Field>
            <Check
              label="Enable paid checkout"
              checked={p.enabled}
              onChange={(v) => setP({ ...p, enabled: v })}
            />
          </>
        )}
        {(["max_projects", "monthly_runs"] as const).map((k) => (
          <Field
            key={k}
            label={
              k === "max_projects"
                ? "Maximum projects (empty = unlimited)"
                : "AI runs per calendar month (empty = unlimited)"
            }
          >
            <Input
              type="number"
              min="0"
              step="1"
              value={p[k] ?? ""}
              onChange={(e) =>
                setP({
                  ...p,
                  [k]: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
        ))}
        <Button className="w-full" disabled={busy}>
          Save {p.name}
        </Button>
      </form>
    </Card>
  );
}
