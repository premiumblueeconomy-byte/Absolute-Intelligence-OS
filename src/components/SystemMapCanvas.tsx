import { useRef, useState } from "react";
import {
  addNode, addEdge, moveNode, deleteNode, deleteEdge,
  NODE_TYPES, RELATIONSHIP_TYPES, NODE_COLOR,
  type SystemNode, type SystemEdge, type NodeType, type RelationshipType,
} from "@/lib/system-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Link2 } from "lucide-react";

const W = 900;
const H = 560;

export function SystemMapCanvas({
  mapId, nodes, edges, onChange,
}: {
  mapId: string;
  nodes: SystemNode[];
  edges: SystemEdge[];
  onChange: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<NodeType>("resource");
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<RelationshipType>("depends_on");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const svgPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((clientX - rect.left) / rect.width) * W, y: ((clientY - rect.top) / rect.height) * H };
  };

  const create = async () => {
    if (!newLabel.trim()) return;
    await addNode({ mapId, nodeType: newType, label: newLabel, x: 80 + Math.random() * (W - 160), y: 80 + Math.random() * (H - 160) });
    setNewLabel("");
    onChange();
  };

  const onNodeClick = (node: SystemNode) => {
    if (!linkFrom) { setLinkFrom(node.id); return; }
    if (linkFrom === node.id) { setLinkFrom(null); return; }
    void addEdge({ mapId, sourceNodeId: linkFrom, targetNodeId: node.id, relationshipType: linkType }).then(onChange);
    setLinkFrom(null);
  };

  // Position updates are local-only while dragging (no network calls per
  // pixel); the new position is persisted once, on pointer up.
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragPos(svgPoint(e.clientX, e.clientY));
  };

  const endDrag = () => {
    if (dragging && dragPos) {
      void moveNode(dragging, Math.round(dragPos.x), Math.round(dragPos.y)).then(onChange);
    }
    setDragging(null);
    setDragPos(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Node label" className="h-8 w-40 text-xs" onKeyDown={(e) => e.key === "Enter" && void create()} />
        <select value={newType} onChange={(e) => setNewType(e.target.value as NodeType)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          {NODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button size="sm" onClick={create}><Plus className="w-3.5 h-3.5" /> Add node</Button>

        <span className="w-px h-5 bg-border mx-1" />

        <select value={linkType} onChange={(e) => setLinkType(e.target.value as RelationshipType)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          {RELATIONSHIP_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Link2 className="w-3.5 h-3.5" /> {linkFrom ? "Click the target node…" : "Click a node, then another, to connect"}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[480px] rounded-lg border border-border bg-secondary/30"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--muted-foreground))" />
          </marker>
        </defs>

        {edges.map((edge) => {
          const rawSource = nodes.find((n) => n.id === edge.source_node_id);
          const rawTarget = nodes.find((n) => n.id === edge.target_node_id);
          if (!rawSource || !rawTarget) return null;
          const source = rawSource.id === dragging && dragPos ? dragPos : rawSource;
          const target = rawTarget.id === dragging && dragPos ? dragPos : rawTarget;
          const mx = (source.x + target.x) / 2;
          const my = (source.y + target.y) / 2;
          return (
            <g key={edge.id}>
              <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="hsl(var(--muted-foreground))" strokeWidth={1.4} markerEnd="url(#arrow)" />
              <rect x={mx - 34} y={my - 9} width={68} height={16} rx={4} fill="hsl(var(--background))" opacity={0.9} />
              <text x={mx} y={my + 3} textAnchor="middle" fontSize={8.5} fill="hsl(var(--muted-foreground))" className="font-mono" onClick={() => void deleteEdge(edge.id).then(onChange)} style={{ cursor: "pointer" }}>
                {edge.relationship_type.replace(/_/g, " ")}
              </text>
            </g>
          );
        })}

        {nodes.map((node) => {
          const pos = node.id === dragging && dragPos ? dragPos : node;
          return (
          <g
            key={node.id}
            transform={`translate(${pos.x}, ${pos.y})`}
            onPointerDown={() => setDragging(node.id)}
            onClick={() => onNodeClick(node)}
            style={{ cursor: "pointer" }}
          >
            <circle r={26} fill={NODE_COLOR[node.node_type]} opacity={linkFrom === node.id ? 1 : 0.85} stroke={linkFrom === node.id ? "hsl(var(--foreground))" : "none"} strokeWidth={2} />
            <text textAnchor="middle" dy={4} fontSize={9} fontWeight={700} fill="#fff">{node.label.slice(0, 10)}</text>
            <text textAnchor="middle" dy={40} fontSize={8} fill="hsl(var(--muted-foreground))" className="font-mono">{node.node_type}</text>
            <text
              textAnchor="middle" x={22} y={-22} fontSize={11} fill="hsl(var(--destructive))"
              onClick={(e) => { e.stopPropagation(); void deleteNode(node.id).then(onChange); }}
              style={{ cursor: "pointer" }}
            >
              ✕
            </text>
          </g>
          );
        })}
      </svg>
      {nodes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Complex problems become clearer when relationships are visible. Add your first node above.
        </p>
      )}
    </div>
  );
}
