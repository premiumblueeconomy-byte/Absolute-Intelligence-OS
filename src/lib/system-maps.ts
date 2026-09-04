import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SystemMap = Database["public"]["Tables"]["system_maps"]["Row"];
export type SystemNode = Database["public"]["Tables"]["system_nodes"]["Row"];
export type SystemEdge = Database["public"]["Tables"]["system_edges"]["Row"];
export type NodeType = SystemNode["node_type"];
export type RelationshipType = SystemEdge["relationship_type"];

export const NODE_TYPES: NodeType[] = [
  "actor", "resource", "problem", "technology", "product", "market",
  "institution", "company", "community", "policy", "infrastructure",
  "waste", "knowledge", "capital", "constraint",
];

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "causes", "enables", "depends_on", "produces", "consumes", "transforms",
  "finances", "regulates", "supplies", "buys", "competes_with",
  "substitutes", "inhibits", "amplifies", "reduces",
];

export const NODE_COLOR: Record<NodeType, string> = {
  actor: "#f2a71b", resource: "#2f9e6e", problem: "#d64545", technology: "#3b82c4",
  product: "#8a5cf5", market: "#0ea5b7", institution: "#64748b", company: "#475569",
  community: "#e8823a", policy: "#94a3b8", infrastructure: "#6b7280", waste: "#7c6f57",
  knowledge: "#22a5d6", capital: "#c7952b", constraint: "#b23b3b",
};

export async function listMaps(projectId: string): Promise<SystemMap[]> {
  const { data, error } = await supabase.from("system_maps").select("*").eq("project_id", projectId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createMap(input: { projectId: string; opportunityId?: string; title: string }): Promise<SystemMap> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("system_maps")
    .insert({ project_id: input.projectId, opportunity_id: input.opportunityId ?? null, user_id: auth.user.id, title: input.title })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getMap(id: string): Promise<SystemMap | null> {
  const { data, error } = await supabase.from("system_maps").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listNodes(mapId: string): Promise<SystemNode[]> {
  const { data, error } = await supabase.from("system_nodes").select("*").eq("map_id", mapId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listEdges(mapId: string): Promise<SystemEdge[]> {
  const { data, error } = await supabase.from("system_edges").select("*").eq("map_id", mapId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function addNode(input: { mapId: string; nodeType: NodeType; label: string; x: number; y: number }): Promise<SystemNode> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("system_nodes")
    .insert({ map_id: input.mapId, user_id: auth.user.id, node_type: input.nodeType, label: input.label, x: input.x, y: input.y })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function moveNode(id: string, x: number, y: number): Promise<void> {
  const { error } = await supabase.from("system_nodes").update({ x, y }).eq("id", id);
  if (error) throw error;
}

export async function deleteNode(id: string): Promise<void> {
  const { error } = await supabase.from("system_nodes").delete().eq("id", id);
  if (error) throw error;
}

export async function addEdge(input: {
  mapId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: RelationshipType;
  description?: string;
}): Promise<SystemEdge> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("system_edges")
    .insert({
      map_id: input.mapId,
      user_id: auth.user.id,
      source_node_id: input.sourceNodeId,
      target_node_id: input.targetNodeId,
      relationship_type: input.relationshipType,
      description: input.description ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEdge(id: string): Promise<void> {
  const { error } = await supabase.from("system_edges").delete().eq("id", id);
  if (error) throw error;
}
