import { useNavigate } from "@tanstack/react-router";
import type { IntelligenceGraph, GraphNode } from "@/lib/intelligence-graph";

const NODE_COLOR: Record<GraphNode["type"], string> = {
  project: "#475569",
  resource: "#2f9e6e",
  problem: "#d64545",
  opportunity: "#f2a71b",
};

const NODE_RADIUS: Record<GraphNode["type"], number> = {
  project: 22,
  resource: 16,
  problem: 16,
  opportunity: 18,
};

export function IntelligenceGraphCanvas({ graph }: { graph: IntelligenceGraph }) {
  const navigate = useNavigate();
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  const goTo = (node: GraphNode) => {
    if (node.type === "opportunity") void navigate({ to: "/opportunities/$opportunityId", params: { opportunityId: node.refId } });
    else void navigate({ to: "/projects/$projectId", params: { projectId: node.projectId } });
  };

  return (
    <svg viewBox={`0 0 ${graph.width} ${graph.height}`} className="w-full rounded-lg border border-border bg-secondary/30" style={{ height: Math.min(Math.max(graph.height, 320), 1400) }}>
      {graph.edges.map((edge) => {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (!source || !target) return null;
        const dashed = edge.kind === "related_market";
        const color = edge.kind === "sourced_from" ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))";
        return (
          <line
            key={edge.id}
            x1={source.x} y1={source.y} x2={target.x} y2={target.y}
            stroke={color}
            strokeWidth={dashed ? 1 : 1.3}
            strokeDasharray={dashed ? "3 4" : undefined}
            opacity={dashed ? 0.5 : 0.75}
          />
        );
      })}

      {graph.nodes.map((node) => {
        const r = NODE_RADIUS[node.type];
        return (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => goTo(node)} style={{ cursor: "pointer" }}>
            <circle r={r} fill={NODE_COLOR[node.type]} opacity={0.9} />
            {node.type === "opportunity" && typeof node.score === "number" && (
              <text textAnchor="middle" dy={4} fontSize={9} fontWeight={700} fill="#fff">{Math.round(node.score)}</text>
            )}
            <text
              textAnchor={node.type === "project" ? "end" : node.type === "opportunity" ? "start" : "middle"}
              x={node.type === "project" ? -r - 6 : node.type === "opportunity" ? r + 6 : 0}
              y={node.type === "resource" || node.type === "problem" ? r + 12 : 4}
              fontSize={10}
              fontWeight={node.type === "project" ? 700 : 500}
              fill="hsl(var(--foreground))"
            >
              {node.label.length > 34 ? `${node.label.slice(0, 34)}…` : node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
