import { useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { SystemMapCanvas } from "@/components/SystemMapCanvas";
import { getMap, listNodes, listEdges, type SystemMap, type SystemNode, type SystemEdge } from "@/lib/system-maps";
import { getProject, type Project } from "@/lib/projects";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function SystemMapPage() {
  const { ready } = useRequireAuth();
  const { mapId } = useParams({ from: "/maps/$mapId" });
  const [map, setMap] = useState<SystemMap | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [nodes, setNodes] = useState<SystemNode[]>([]);
  const [edges, setEdges] = useState<SystemEdge[]>([]);

  const load = async () => {
    const m = await getMap(mapId);
    setMap(m);
    if (m) {
      const [p, n, e] = await Promise.all([getProject(m.project_id), listNodes(mapId), listEdges(mapId)]);
      setProject(p); setNodes(n); setEdges(e);
    }
  };
  useEffect(() => { if (ready) void load(); }, [mapId, ready]);

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
        <SystemMapCanvas mapId={mapId} nodes={nodes} edges={edges} onChange={load} />
      </main>
    </div>
  );
}
