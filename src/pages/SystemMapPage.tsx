import { useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { SystemMapCanvas } from "@/components/SystemMapCanvas";
import { getMap, listNodes, listEdges, generateSystemMap, type SystemMap, type SystemNode, type SystemEdge } from "@/lib/system-maps";
import { getProject, type Project } from "@/lib/projects";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Sparkles } from "lucide-react";

export default function SystemMapPage() {
  const { ready } = useRequireAuth();
  const { mapId } = useParams({ from: "/maps/$mapId" });
  const [map, setMap] = useState<SystemMap | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [nodes, setNodes] = useState<SystemNode[]>([]);
  const [edges, setEdges] = useState<SystemEdge[]>([]);
  const [subject, setSubject] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const m = await getMap(mapId);
    setMap(m);
    if (m) {
      const [p, n, e] = await Promise.all([getProject(m.project_id), listNodes(mapId), listEdges(mapId)]);
      setProject(p); setNodes(n); setEdges(e);
      if (!subject) setSubject([p?.title, p?.objective].filter(Boolean).join(" — "));
    }
  };
  useEffect(() => { if (ready) void load(); }, [mapId, ready]);

  const generate = async () => {
    if (!subject.trim()) return;
    setGenerating(true);
    try {
      const { nodes: newNodes } = await generateSystemMap(mapId, subject);
      toast.success(`${newNodes.length} nodes generated`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate the system map");
    } finally {
      setGenerating(false);
    }
  };

  if (!map) {
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-8">
        {project && (
          <Link to="/projects/$projectId" params={{ projectId: project.id }} className="text-xs text-muted-foreground hover:text-accent">
            ← {project.title}
          </Link>
        )}
        <h1 className="text-2xl font-black mt-2 mb-6">{map.title}</h1>

        {nodes.length === 0 && (
          <Card className="p-4 mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold"><Sparkles className="w-4 h-4 text-accent" /> Generate with AI</div>
            <div className="flex gap-2">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this system about?" className="flex-1" />
              <Button onClick={generate} disabled={generating || !subject.trim()} variant="accent">
                {generating ? "Generating…" : "Generate"}
              </Button>
            </div>
            <WorkflowProgress active={generating} />
          </Card>
        )}

        <SystemMapCanvas mapId={mapId} nodes={nodes} edges={edges} onChange={load} />
      </main>
    </div>
  );
}
