import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  getPlatformStats, listOrganizationsAdmin, listRecentProjectsAdmin,
  type PlatformStats, type AdminOrganization, type AdminProject,
} from "@/lib/admin";
import { ShieldAlert } from "lucide-react";

export default function Admin() {
  const { ready, profile } = useRequireAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = !!profile?.is_platform_admin;

  useEffect(() => {
    if (!ready || !isAdmin) { setLoading(false); return; }
    setLoading(true);
    void Promise.all([
      getPlatformStats().then(setStats),
      listOrganizationsAdmin().then(setOrgs),
      listRecentProjectsAdmin(20).then(setProjects),
    ]).finally(() => setLoading(false));
  }, [ready, isAdmin]);

  if (ready && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav />
        <main className="flex-1 max-w-lg w-full mx-auto px-4 md:px-6 py-16 text-center">
          <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-lg font-bold mb-1">Not authorized</h1>
          <p className="text-sm text-muted-foreground">This page is restricted to platform admins.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-1">
          <ShieldAlert className="w-5 h-5 text-accent" /> Admin
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Platform-wide aggregates only — no other user's project content, opportunities, or
          contact details are readable from here. Every number below comes straight from a
          count(*), not an estimate.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              {stats && (
                <>
                  <Stat label="Users" value={stats.total_users} />
                  <Stat label="Organizations" value={stats.total_organizations} />
                  <Stat label="Projects" value={stats.total_projects} />
                  <Stat label="Opportunities" value={stats.total_opportunities} />
                  <Stat label="Resource runs" value={stats.total_resources} />
                  <Stat label="Problem runs" value={stats.total_problems} />
                </>
              )}
            </div>

            <section className="mb-8">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Organizations</h2>
              {orgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {orgs.map((o) => (
                    <Card key={o.id} className="p-3 flex items-center justify-between text-xs">
                      <span className="font-semibold">{o.name}</span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Badge variant="outline">{o.org_type.replace(/_/g, " ")}</Badge>
                        {o.member_count} member{o.member_count === 1 ? "" : "s"}
                        <span>{new Date(o.created_at).toLocaleDateString()}</span>
                      </span>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Recent projects</h2>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {projects.map((p) => (
                    <Card key={p.id} className="p-3 flex items-center justify-between text-xs">
                      <span className="font-semibold">{p.title}</span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {[p.location_country, p.industry].filter(Boolean).join(" · ") || "—"}
                        <Badge variant="outline">{p.status}</Badge>
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      </span>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </Card>
  );
}
