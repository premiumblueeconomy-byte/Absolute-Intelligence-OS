import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { IntelligenceGraphCanvas } from "@/components/IntelligenceGraphCanvas";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { buildIntelligenceGraph, type IntelligenceGraph as GraphData } from "@/lib/intelligence-graph";
import { Network } from "lucide-react";

const LEGEND: { color: string; label: string }[] = [
  { color: "#475569", label: "Project" },
  { color: "#2f9e6e", label: "Resource" },
  { color: "#d64545", label: "Problem" },
  { color: "#f2a71b", label: "Opportunity (number = opportunity score)" },
];

export default function IntelligenceGraph() {
  const { ready } = useRequireAuth();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    void buildIntelligenceGraph().then(setGraph).finally(() => setLoading(false));
  }, [ready]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-1">
          <Network className="w-5 h-5 text-accent" /> Intelligence Graph
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          Every project, resource, problem and opportunity you can see, connected by real
          relationships only: solid lines are actual foreign keys (a project owns a resource, a
          resource or problem produced an opportunity); dashed amber lines are a computed overlap
          — two opportunities in different projects that share the same country and industry. This
          is not an AI-generated map and nothing here is inferred beyond that one field match.
          Click any node to open it.
        </p>

        <div className="flex flex-wrap gap-3 mb-4 text-[11px] text-muted-foreground">
          {LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: l.color }} /> {l.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-accent inline-block" /> Related market (same country + industry)
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : !graph || graph.nodes.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <p className="text-sm font-semibold">Nothing to graph yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Create a project and run a Resource or Problem Explorer to populate the graph.</p>
          </Card>
        ) : (
          <IntelligenceGraphCanvas graph={graph} />
        )}
      </main>
    </div>
  );
}
