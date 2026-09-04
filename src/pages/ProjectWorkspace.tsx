import { useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { getProject, type Project } from "@/lib/projects";
import { listOpportunities, type Opportunity } from "@/lib/opportunities";
import { runResourceExplorer } from "@/lib/resources";
import { runProblemExplorer } from "@/lib/problems";
import { readinessLabel } from "@/lib/scoring";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { listMaps, createMap, type SystemMap } from "@/lib/system-maps";
import { embedProjectOpportunities } from "@/lib/semantic-search";
import { ResearchTab } from "@/components/project/ResearchTab";
import { DecisionsTab } from "@/components/project/DecisionsTab";
import { ArrowRight, Sprout, AlertTriangle, GitBranch, Plus, Sparkles, Loader2 } from "lucide-react";

export default function ProjectWorkspace() {
  const { ready } = useRequireAuth();
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const [project, setProject] = useState<Project | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const reload = async () => {
    const [p, o] = await Promise.all([getProject(projectId), listOpportunities(projectId)]);
    setProject(p);
    setOpportunities(o);
  };
  useEffect(() => { if (ready) void reload(); }, [projectId, ready]);

  if (!project) {
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black">{project.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {[project.location_country, project.industry].filter(Boolean).join(" · ") || "No location or industry set"}
            {"  ·  "}AI confidence {project.ai_confidence}/100
          </p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities ({opportunities.length})</TabsTrigger>
            <TabsTrigger value="systems">Systems</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab project={project} opportunities={opportunities} />
          </TabsContent>

          <TabsContent value="discover">
            <DiscoverTab projectId={projectId} onDiscovered={reload} />
          </TabsContent>

          <TabsContent value="opportunities">
            <OpportunitiesTab projectId={projectId} opportunities={opportunities} onReload={reload} />
          </TabsContent>

          <TabsContent value="systems">
            <SystemsTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="research">
            <ResearchTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="decisions">
            <DecisionsTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function OverviewTab({ project, opportunities }: { project: Project; opportunities: Opportunity[] }) {
  const top = [...opportunities].sort((a, b) => b.opportunity_score - a.opportunity_score).slice(0, 3);
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Objective</h2>
        <p className="text-sm">{project.objective || "No objective recorded yet."}</p>
      </Card>
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Top opportunities</h2>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">Run the Discover tab to generate opportunities.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {top.map((o) => (
              <Link key={o.id} to="/opportunities/$opportunityId" params={{ opportunityId: o.id }}>
                <Card className="p-4 h-full hover:border-accent/50 transition-colors">
                  <div className="text-sm font-bold truncate">{o.title}</div>
                  <Badge variant="outline" className="mt-2">{o.opportunity_score}/100</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoverTab({ projectId, onDiscovered }: { projectId: string; onDiscovered: () => void }) {
  const [mode, setMode] = useState<"resource" | "problem">("resource");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [running, setRunning] = useState(false);
  const [lastCount, setLastCount] = useState<number | null>(null);

  const run = async () => {
    if (!name.trim()) return;
    setRunning(true);
    setLastCount(null);
    try {
      const { result } = mode === "resource"
        ? await runResourceExplorer({ projectId, name, location })
        : await runProblemExplorer({ projectId, statement: name, location });
      setLastCount(result.opportunities.length);
      toast.success(`${result.opportunities.length} opportunities discovered`);
      onDiscovered();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex gap-2 mb-4">
        <Button size="sm" variant={mode === "resource" ? "default" : "outline"} onClick={() => setMode("resource")}>
          <Sprout className="w-3.5 h-3.5" /> Resource Explorer
        </Button>
        <Button size="sm" variant={mode === "problem" ? "default" : "outline"} onClick={() => setMode("problem")}>
          <AlertTriangle className="w-3.5 h-3.5" /> Problem Explorer
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="subject">{mode === "resource" ? "Resource" : "Problem"}</Label>
          {mode === "resource" ? (
            <Input id="subject" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. coconut shell" />
          ) : (
            <Textarea id="subject" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. youth unemployment" />
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Ghana" />
        </div>
        <Button onClick={run} disabled={running || !name.trim()} variant="accent">
          {running ? "Running…" : "Run intelligence analysis"}
        </Button>
        <WorkflowProgress active={running} />
        {lastCount !== null && !running && (
          <p className="text-sm text-muted-foreground">
            Done — see the Opportunities tab, or <ArrowRight className="w-3 h-3 inline" /> jump to the highest-scored one from Overview.
          </p>
        )}
      </div>
    </Card>
  );
}

function OpportunitiesTab({ projectId, opportunities, onReload }: { projectId: string; opportunities: Opportunity[]; onReload: () => void }) {
  const [embedding, setEmbedding] = useState(false);
  const notEmbedded = opportunities.filter((o) => !o.embedded_at).length;

  const embedAll = async () => {
    setEmbedding(true);
    try {
      const count = await embedProjectOpportunities(projectId);
      toast.success(count > 0 ? `Embedded ${count} opportunit${count === 1 ? "y" : "ies"} for semantic search` : "Nothing to embed");
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not embed opportunities — is EMBEDDING_API_KEY set on the Supabase project?");
    } finally {
      setEmbedding(false);
    }
  };

  if (opportunities.length === 0) {
    return <p className="text-sm text-muted-foreground">No opportunities saved yet. Discover your first one.</p>;
  }
  return (
    <div className="space-y-3">
      {notEmbedded > 0 && (
        <Button size="sm" variant="outline" onClick={embedAll} disabled={embedding}>
          {embedding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Enable semantic search ({notEmbedded} not yet embedded)
        </Button>
      )}
    <ul className="space-y-2">
      {opportunities.map((o) => {
        const readiness = readinessLabel(o.opportunity_score);
        return (
          <li key={o.id}>
            <Link to="/opportunities/$opportunityId" params={{ opportunityId: o.id }}>
              <Card className="p-4 flex items-center justify-between gap-3 hover:border-accent/50 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{o.title}</div>
                  <p className="text-xs text-muted-foreground truncate">{o.summary}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline">{o.opportunity_score}/100</Badge>
                  <span className="text-[11px] text-muted-foreground">{readiness.label}</span>
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
    </div>
  );
}

function SystemsTab({ projectId }: { projectId: string }) {
  const [maps, setMaps] = useState<SystemMap[]>([]);
  const [title, setTitle] = useState("");

  const load = () => { void listMaps(projectId).then(setMaps); };
  useEffect(load, [projectId]);

  const create = async () => {
    if (!title.trim()) return;
    await createMap({ projectId, title });
    setTitle("");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New system map title" onKeyDown={(e) => e.key === "Enter" && void create()} />
        <Button onClick={create}><Plus className="w-3.5 h-3.5" /> Create</Button>
      </div>
      {maps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Complex problems become clearer when relationships are visible. Create your first system map.
        </p>
      ) : (
        <ul className="space-y-2">
          {maps.map((m) => (
            <li key={m.id}>
              <Link to="/maps/$mapId" params={{ mapId: m.id }}>
                <Card className="p-4 flex items-center justify-between hover:border-accent/50 transition-colors">
                  <span className="text-sm font-bold flex items-center gap-2"><GitBranch className="w-4 h-4 text-accent" /> {m.title}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
