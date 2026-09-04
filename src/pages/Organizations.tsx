import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  listMyOrganizations, createOrganization, listMyPendingInvites, acceptInvite, declineInvite,
  ORG_TYPE_LABEL, type Organization, type OrgType, type OrganizationInvite,
} from "@/lib/organizations";
import { Building2, Plus, ArrowRight, Check, X } from "lucide-react";

export default function Organizations() {
  const { ready, user } = useRequireAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("company");
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    void listMyOrganizations().then(setOrgs);
    void listMyPendingInvites().then((all) => setInvites(all.filter((i) => i.email.toLowerCase() === user?.email?.toLowerCase())));
  };
  useEffect(() => { if (ready) load(); }, [ready, user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createOrganization({ name, orgType });
      setName("");
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create organization");
    }
  };

  const accept = async (invite: OrganizationInvite) => {
    try {
      await acceptInvite(invite.id);
      toast.success("Joined organization");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept invite");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black flex items-center gap-2"><Building2 className="w-5 h-5 text-accent" /> Organizations</h1>
          <Button size="sm" variant={showForm ? "outline" : "default"} onClick={() => setShowForm((s) => !s)}>
            <Plus className="w-3.5 h-3.5" /> New organization
          </Button>
        </div>

        {showForm && (
          <Card className="p-4 mb-6">
            <form onSubmit={create} className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" className="flex-1" />
              <select value={orgType} onChange={(e) => setOrgType(e.target.value as OrgType)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                {(Object.keys(ORG_TYPE_LABEL) as OrgType[]).map((t) => <option key={t} value={t}>{ORG_TYPE_LABEL[t]}</option>)}
              </select>
              <Button type="submit" size="sm">Create</Button>
            </form>
          </Card>
        )}

        {invites.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Pending invites</h2>
            <div className="space-y-2">
              {invites.map((i) => (
                <Card key={i.id} className="p-3 flex items-center justify-between gap-2">
                  <span className="text-sm">You've been invited as <Badge variant="outline">{i.role}</Badge></span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => accept(i)}><Check className="w-3.5 h-3.5" /> Accept</Button>
                    <Button size="sm" variant="ghost" onClick={() => declineInvite(i.id).then(load)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {orgs.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm text-muted-foreground">Not part of any organization yet.</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {orgs.map((o) => (
              <li key={o.id}>
                <Link to="/organizations/$orgId" params={{ orgId: o.id }}>
                  <Card className="p-4 flex items-center justify-between hover:border-accent/50 transition-colors">
                    <div>
                      <div className="text-sm font-bold">{o.name}</div>
                      <div className="text-[11px] text-muted-foreground">{ORG_TYPE_LABEL[o.org_type]}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
