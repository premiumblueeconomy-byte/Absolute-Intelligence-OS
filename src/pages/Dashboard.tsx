import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { listProjects, type Project } from "@/lib/projects";
import { listAllOpportunities, type Opportunity } from "@/lib/opportunities";
import { readinessLabel } from "@/lib/scoring";
import { Briefcase, TrendingUp, Plus, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { void navigate({ to: "/login" }); return; }
    if (profile && !profile.onboarded) { void navigate({ to: "/onboarding" }); return; }
    (async () => {
      const [p, o] = await Promise.all([listProjects(), listAllOpportunities()]);
      setProjects(p);
      setOpportunities(o.slice(0, 6));
      setReady(true);
    })();
  }, [loading, user, profile, navigate]);

  if (!ready) {
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-10">
        <h1 className="text-2xl md:text-3xl font-black">What would you like to unlock?</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Give AIOS a resource, problem, technology, market or idea inside a project.
        </p>

        <div className="flex gap-3 mb-10">
          <Button variant="accent" size="lg" asChild>
            <Link to="/projects">
              <Plus className="w-4 h-4" /> New project
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/prompts">Browse Prompt Library</Link>
          </Button>
        </div>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Active projects
            </h2>
            <Link to="/projects" className="text-xs font-semibold text-accent">View all</Link>
          </div>
          {projects.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm font-semibold">Your intelligence work begins here.</p>
              <p className="text-xs text-muted-foreground mt-1">Create a project to start unlocking opportunities.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {projects.slice(0, 4).map((p) => (
                <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }}>
                  <Card className="p-4 hover:border-accent/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold truncate">{p.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {[p.location_country, p.industry].filter(Boolean).join(" · ") || "No location or industry set"}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Opportunity radar
          </h2>
          {opportunities.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">No opportunities discovered yet.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {opportunities.map((o) => {
                const readiness = readinessLabel(o.opportunity_score);
                return (
                  <Link key={o.id} to="/opportunities/$opportunityId" params={{ opportunityId: o.id }}>
                    <Card className="p-4 hover:border-accent/50 transition-colors h-full">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold">{o.title}</span>
                        <Badge variant="outline">{o.opportunity_score}/100</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.summary}</p>
                      <div className="text-[11px] text-muted-foreground mt-2">{readiness.label} · Confidence {o.confidence_score}/100</div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
