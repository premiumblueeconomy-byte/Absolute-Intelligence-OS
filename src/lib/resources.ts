import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { runIntelligenceWorkflow, type AgentOutput } from "@/lib/ask-absolute";
import { persistOpportunities, persistAssumptions, persistUnknowns, persistClaims } from "@/lib/opportunities";

export type ResourceRun = Database["public"]["Tables"]["resources"]["Row"];

const RESOURCE_AGENTS = [
  "reality_agent", "resource_agent", "science_agent", "evidence_agent",
  "technology_agent", "market_agent", "opportunity_agent", "risk_agent", "integrator_agent",
];

/** Resource Explorer (spec section 8/9): resource + location -> cascade + opportunities. */
export async function runResourceExplorer(input: { projectId: string; name: string; location: string }): Promise<{ run: ResourceRun; result: AgentOutput }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");

  const { data: run, error: insertError } = await supabase
    .from("resources")
    .insert({ project_id: input.projectId, user_id: auth.user.id, name: input.name, location: input.location, status: "running" })
    .select("*")
    .single();
  if (insertError) throw insertError;

  try {
    const result = await runIntelligenceWorkflow({
      mode: "discover",
      agents: RESOURCE_AGENTS,
      prompt: `Analyze the resource "${input.name}"${input.location ? ` in ${input.location}` : ""}. Identify its components, useful properties, transformation pathways, potential products, markets, waste streams, and generate 5-8 structured opportunities ranked by potential. Follow the Resource-to-Opportunity Cascade: resource -> component -> property -> function -> process -> technology -> product -> application -> customer -> market -> enterprise.`,
      context: { resource: input.name, location: input.location, projectId: input.projectId },
    });

    await supabase.from("resources").update({ ai_result: result as unknown as import("@/integrations/supabase/types").Json, status: "completed" }).eq("id", run.id);

    const created = await persistOpportunities({
      projectId: input.projectId,
      sourceType: "resource",
      sourceResourceId: run.id,
      geography: { locality: input.location },
      opportunities: result.opportunities,
      confidenceScore: result.confidence,
    });
    for (const opp of created) {
      await persistAssumptions(opp.id, result.assumptions);
      await persistUnknowns(opp.id, result.unknowns);
    }
    await persistClaims(input.projectId, null, result.claims);

    return { run: { ...run, ai_result: result as unknown as import("@/integrations/supabase/types").Json, status: "completed" }, result };
  } catch (err) {
    await supabase.from("resources").update({ status: "failed" }).eq("id", run.id);
    throw err;
  }
}

export async function listResourceRuns(projectId: string): Promise<ResourceRun[]> {
  const { data, error } = await supabase.from("resources").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
