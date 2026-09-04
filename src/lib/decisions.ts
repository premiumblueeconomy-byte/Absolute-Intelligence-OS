import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Decision = Database["public"]["Tables"]["decisions"]["Row"];

export async function listDecisions(projectId: string): Promise<Decision[]> {
  const { data, error } = await supabase.from("decisions").select("*").eq("project_id", projectId).order("decided_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createDecision(input: {
  projectId: string;
  opportunityId?: string;
  decision: string;
  decisionMaker?: string;
  context?: string;
  optionsConsidered?: string;
  evidence?: string;
  assumptions?: string;
  expectedOutcome?: string;
}): Promise<Decision> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("decisions")
    .insert({
      project_id: input.projectId,
      opportunity_id: input.opportunityId ?? null,
      user_id: auth.user.id,
      decision: input.decision,
      decision_maker: input.decisionMaker ?? "",
      context: input.context ?? "",
      options_considered: input.optionsConsidered ?? "",
      evidence: input.evidence ?? "",
      assumptions: input.assumptions ?? "",
      expected_outcome: input.expectedOutcome ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateDecisionOutcome(id: string, actualOutcome: string, learning: string): Promise<void> {
  const { error } = await supabase.from("decisions").update({ actual_outcome: actualOutcome, learning }).eq("id", id);
  if (error) throw error;
}

export async function deleteDecision(id: string): Promise<void> {
  const { error } = await supabase.from("decisions").delete().eq("id", id);
  if (error) throw error;
}
