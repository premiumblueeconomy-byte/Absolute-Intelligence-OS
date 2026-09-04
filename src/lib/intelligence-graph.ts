import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Resource = Database["public"]["Tables"]["resources"]["Row"];
type Problem = Database["public"]["Tables"]["problems"]["Row"];
type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];

export type GraphNodeType = "project" | "resource" | "problem" | "opportunity";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  refId: string;
  projectId: string;
  x: number;
  y: number;
  score?: number;
  confidence?: number;
  status?: string;
}

/**
 * "contains": a project literally owns the row (project_id FK).
 * "sourced_from": the opportunity's own source_resource_id / source_problem_id FK.
 * "related_market": computed, not stored — two opportunities in different
 * projects that share both country and industry. This is a real overlap of
 * real fields, not an invented relationship, but it IS inferred rather than
 * an explicit link, so it's rendered as a dashed line and labeled as such.
 */
export type GraphEdgeKind = "contains" | "sourced_from" | "related_market";

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
}

export interface IntelligenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

const COL_PROJECT = 110;
const COL_SOURCE = 440;
const COL_OPPORTUNITY = 770;
const ROW_H = 64;
const PROJECT_GAP = 36;
const MAX_RELATED_MARKET_EDGES = 60;

async function fetchAll() {
  const [projectsRes, resourcesRes, problemsRes, opportunitiesRes] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("resources").select("*"),
    supabase.from("problems").select("*"),
    supabase.from("opportunities").select("*"),
  ]);
  if (projectsRes.error) throw projectsRes.error;
  if (resourcesRes.error) throw resourcesRes.error;
  if (problemsRes.error) throw problemsRes.error;
  if (opportunitiesRes.error) throw opportunitiesRes.error;
  return {
    projects: projectsRes.data ?? [],
    resources: resourcesRes.data ?? [],
    problems: problemsRes.data ?? [],
    opportunities: opportunitiesRes.data ?? [],
  };
}

function groupBy<T extends { project_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    if (!map.has(row.project_id)) map.set(row.project_id, []);
    map.get(row.project_id)!.push(row);
  }
  return map;
}

/**
 * Builds a cross-project graph from every project/resource/problem/opportunity
 * the caller can see (RLS already scopes this to owned + org-shared rows —
 * same access rule as the rest of the app, no separate graph table).
 * Every edge traces back to a real foreign key or a real field match; nothing
 * is fabricated or AI-generated.
 */
export async function buildIntelligenceGraph(): Promise<IntelligenceGraph> {
  const { projects, resources, problems, opportunities } = await fetchAll();

  const resourcesByProject = groupBy(resources);
  const problemsByProject = groupBy(problems);
  const opportunitiesByProject = groupBy(opportunities as (Opportunity & { project_id: string })[]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let y = 50;

  for (const project of projects) {
    const res = resourcesByProject.get(project.id) ?? [];
    const prob = problemsByProject.get(project.id) ?? [];
    const opps = opportunitiesByProject.get(project.id) ?? [];
    const sourceItems: { id: string; type: "resource" | "problem"; label: string }[] = [
      ...res.map((r) => ({ id: r.id, type: "resource" as const, label: r.name })),
      ...prob.map((p) => ({ id: p.id, type: "problem" as const, label: p.statement })),
    ];
    const blockHeight = Math.max(sourceItems.length, opps.length, 1) * ROW_H;

    nodes.push({
      id: `project:${project.id}`, type: "project", label: project.title,
      refId: project.id, projectId: project.id, x: COL_PROJECT, y: y + blockHeight / 2,
    });

    sourceItems.forEach((item, i) => {
      const nodeId = `${item.type}:${item.id}`;
      nodes.push({ id: nodeId, type: item.type, label: item.label, refId: item.id, projectId: project.id, x: COL_SOURCE, y: y + i * ROW_H + ROW_H / 2 });
      edges.push({ id: `e:${nodeId}`, source: `project:${project.id}`, target: nodeId, kind: "contains" });
    });

    opps.forEach((o, i) => {
      const nodeId = `opportunity:${o.id}`;
      nodes.push({
        id: nodeId, type: "opportunity", label: o.title, refId: o.id, projectId: project.id,
        x: COL_OPPORTUNITY, y: y + i * ROW_H + ROW_H / 2,
        score: o.opportunity_score, confidence: o.confidence_score, status: o.status,
      });
      if (o.source_resource_id) {
        edges.push({ id: `e:src:${o.id}`, source: `resource:${o.source_resource_id}`, target: nodeId, kind: "sourced_from" });
      } else if (o.source_problem_id) {
        edges.push({ id: `e:src:${o.id}`, source: `problem:${o.source_problem_id}`, target: nodeId, kind: "sourced_from" });
      } else {
        edges.push({ id: `e:src:${o.id}`, source: `project:${project.id}`, target: nodeId, kind: "contains" });
      }
    });

    y += blockHeight + PROJECT_GAP;
  }

  const byId = new Map(projects.map((p) => [p.id, p]));
  let relatedCount = 0;
  outer: for (let i = 0; i < opportunities.length && relatedCount < MAX_RELATED_MARKET_EDGES; i++) {
    for (let j = i + 1; j < opportunities.length; j++) {
      const a = opportunities[i];
      const b = opportunities[j];
      if (a.project_id === b.project_id) continue;
      const pa = byId.get(a.project_id);
      const pb = byId.get(b.project_id);
      if (!pa || !pb) continue;
      const sameCountry = pa.location_country.trim() && pa.location_country === pb.location_country;
      const sameIndustry = pa.industry.trim() && pa.industry === pb.industry;
      if (sameCountry && sameIndustry) {
        edges.push({ id: `e:rel:${a.id}:${b.id}`, source: `opportunity:${a.id}`, target: `opportunity:${b.id}`, kind: "related_market" });
        relatedCount++;
        if (relatedCount >= MAX_RELATED_MARKET_EDGES) break outer;
      }
    }
  }

  return { nodes, edges, width: COL_OPPORTUNITY + 260, height: Math.max(y, 300) };
}
