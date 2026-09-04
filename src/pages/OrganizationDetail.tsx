import { useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  getOrganization, listMembers, removeMember, changeMemberRole, inviteMember, listSentInvites,
  ORG_TYPE_LABEL, ORG_ROLE_LABEL, type Organization, type OrganizationMember, type OrganizationInvite, type OrgRole,
} from "@/lib/organizations";
import { listOrgProjects, type Project } from "@/lib/projects";
import { UserPlus, Trash2, ArrowRight, Briefcase } from "lucide-react";

const INVITABLE_ROLES: Exclude<OrgRole, "owner">[] = ["admin", "strategist", "researcher", "analyst", "member", "viewer"];

export default function OrganizationDetail() {
  const { ready, user } = useRequireAuth();
  const { orgId } = useParams({ from: "/organizations/$orgId" });
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<OrgRole, "owner">>("member");

  const myMembership = members.find((m) => m.user_id === user?.id);
  const isAdmin = myMembership?.role === "owner" || myMembership?.role === "admin";

  const load = async () => {
    const [o, m, p] = await Promise.all([getOrganization(orgId), listMembers(orgId), listOrgProjects(orgId)]);
    setOrg(o); setMembers(m); setProjects(p);
    if (o) void listSentInvites(orgId).then(setInvites);
  };
  useEffect(() => { if (ready) void load(); }, [orgId, ready]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember({ orgId, email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      toast.success("Invite sent — they'll see it next time they sign in");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite");
    }
  };

  if (!org) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav />
        <main className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 py-8">
        <Link to="/organizations" className="text-xs text-muted-foreground hover:text-accent">← Organizations</Link>
        <h1 className="text-2xl font-black mt-2 mb-1">{org.name}</h1>
        <p className="text-xs text-muted-foreground mb-6">{ORG_TYPE_LABEL[org.org_type]}</p>

        <section className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Shared projects
          </h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects shared with this organization yet — set an organization when creating a project.</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link to="/projects/$projectId" params={{ projectId: p.id }}>
                    <Card className="p-3 flex items-center justify-between hover:border-accent/50 transition-colors">
                      <span className="text-sm font-semibold">{p.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Members</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <Card key={m.id} className="p-3 flex items-center justify-between gap-2">
                <span className="text-sm font-mono">{m.user_id === user?.id ? "You" : m.user_id.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  {isAdmin && m.role !== "owner" ? (
                    <select
                      value={m.role}
                      onChange={(e) => changeMemberRole(m.id, e.target.value as OrgRole).then(load)}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{ORG_ROLE_LABEL[r]}</option>)}
                    </select>
                  ) : (
                    <Badge variant="outline">{ORG_ROLE_LABEL[m.role]}</Badge>
                  )}
                  {isAdmin && m.role !== "owner" && (
                    <button onClick={() => removeMember(m.id).then(load)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {isAdmin && (
          <section>
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Invite a member
            </h2>
            <form onSubmit={invite} className="flex gap-2 mb-4">
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@example.com" className="flex-1" />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Exclude<OrgRole, "owner">)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{ORG_ROLE_LABEL[r]}</option>)}
              </select>
              <Button type="submit" size="sm">Invite</Button>
            </form>
            {invites.length > 0 && (
              <div className="space-y-1.5">
                {invites.map((i) => (
                  <div key={i.id} className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{i.email} — {ORG_ROLE_LABEL[i.role]} (pending)</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
