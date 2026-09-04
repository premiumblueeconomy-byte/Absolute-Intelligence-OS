import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { runIntelligenceWorkflow, type AgentOutput } from "@/lib/ask-absolute";
import { persistOpportunities, persistAssumptions, persistUnknowns, persistClaims } from "@/lib/opportunities";

export type ProblemRun = Database["public"]["Tables"]["problems"]["Row"];

const PROBLEM_AGENTS = [
  "reality_agent", "systems_agent", "causal_agent", "opportunity_agent", "risk_agent", "integrator_agent",
];

/** Problem Explorer (spec section 10): problem -> system decomposition + opportunities. */
export async function runProblemExplorer(input: { projectId: string; statement: string; location: string }): Promise<{ run: ProblemRun; result: AgentOutput }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");

  const { data: run, error: insertError } = await supabase
    .from("problems")
    .insert({ project_id: input.projectId, user_id: auth.user.id, statement: input.statement, location: input.location, status: "running" })
    .select("*")
    .single();
  if (insertError) throw insertError;

  try {
    const result = await runIntelligenceWorkflow({
      mode: "discover",
      agents: PROBLEM_AGENTS,
      prompt: `Analyze the problem "${input.statement}"${input.location ? ` in ${input.location}` : ""} as a system. Identify root causes, actors, affected groups, current solutions and why they fail, constraints, causal relationships and feedback loops, economic/environmental/social cost. Then generate 5-8 structured opportunities: technological, service, infrastructure, data, business, or policy interventions, ranked by leverage.`,
      context: { problem: input.statement, location: input.location, projectId: input.projectId },
    });

    await supabase.from("problems").update({ ai_result: result as unknown as import("@/integrations/supabase/types").Json, status: "completed" }).eq("id", run.id);

    const created = await persistOpportunities({
      projectId: input.projectId,
      sourceType: "problem",
      sourceProblemId: run.id,
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
    await supabase.from("problems").update({ status: "failed" }).eq("id", run.id);
    throw err;
  }
}

export async function listProblemRuns(projectId: string): Promise<ProblemRun[]> {
  const { data, error } = await supabase.from("problems").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
