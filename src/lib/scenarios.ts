import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";


export type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];
export type ScenarioType = Scenario["scenario_type"];

export const SCENARIO_TYPE_LABEL: Record<ScenarioType, string> = {
  baseline: "Baseline", optimistic: "Optimistic", adverse: "Adverse",
  black_swan: "Black Swan", transformative: "Transformative",
};

export { calculateScenario, type ScenarioVariable, type ScenarioResults } from '../../supabase/functions/_shared/scenario-engine';
import type { ScenarioVariable, ScenarioResults } from '../../supabase/functions/_shared/scenario-engine';
export async function listScenarios(opportunityId: string): Promise<Scenario[]> {
  const { data, error } = await supabase.from("scenarios").select("*").eq("opportunity_id", opportunityId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function saveScenario(input: {
  opportunityId: string;
  name: string;
  scenarioType: ScenarioType;
  variables: ScenarioVariable[];
  results: ScenarioResults;
}): Promise<Scenario> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("scenarios")
    .insert({
      opportunity_id: input.opportunityId,
      user_id: auth.user.id,
      name: input.name,
      scenario_type: input.scenarioType,
      variables: input.variables as unknown as Json,
      results: input.results as unknown as Json,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteScenario(id: string): Promise<void> {
  const { error } = await supabase.from("scenarios").delete().eq("id", id);
  if (error) throw error;
}

