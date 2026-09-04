import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { computeOpportunityScore, DEFAULT_WEIGHTS, type ScoreDimensions } from "@/lib/scoring";

export type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];
export type ScenarioType = Scenario["scenario_type"];

export const SCENARIO_TYPE_LABEL: Record<ScenarioType, string> = {
  baseline: "Baseline", optimistic: "Optimistic", adverse: "Adverse",
  black_swan: "Black Swan", transformative: "Transformative",
};

export interface ScenarioVariable {
  name: string;
  unit: string;
  baselineValue: number;
  newValue: number;
  /** How strongly a 1% change in this variable moves margin, from -1 (fully adverse) to +1 (fully beneficial). */
  marginImpactPerPercent: number;
}

export interface ScenarioResults {
  baselineMargin: number;
  marginDeltaPct: number;
  projectedMargin: number;
  baselineOpportunityScore: number;
  projectedOpportunityScore: number;
  riskDelta: "lower" | "unchanged" | "higher";
}

/**
 * A deliberately simple, transparent sensitivity model — NOT a real financial
 * projection. Each variable's percent change is weighted by a user-set
 * elasticity onto margin, then the financial-attractiveness dimension is
 * nudged accordingly and the opportunity score is recomputed. This is
 * clearly a what-if illustration, not a fabricated forecast.
 */
export function calculateScenario(
  baselineDims: ScoreDimensions,
  baselineMargin: number,
  variables: ScenarioVariable[],
  weights: Record<keyof ScoreDimensions, number> = DEFAULT_WEIGHTS,
): ScenarioResults {
  let marginDeltaPct = 0;
  for (const v of variables) {
    if (v.baselineValue === 0) continue;
    const pctChange = (v.newValue - v.baselineValue) / v.baselineValue;
    marginDeltaPct += pctChange * v.marginImpactPerPercent;
  }
  marginDeltaPct = Math.max(-0.95, Math.min(3, marginDeltaPct));

  const projectedMargin = Math.max(-100, Math.min(100, baselineMargin * (1 + marginDeltaPct)));
  const baselineOpportunityScore = computeOpportunityScore(baselineDims, weights);

  const financialDelta = Math.max(-100, Math.min(100, baselineDims.financialAttractiveness * (1 + marginDeltaPct)));
  const projectedDims: ScoreDimensions = { ...baselineDims, financialAttractiveness: financialDelta };
  const projectedOpportunityScore = computeOpportunityScore(projectedDims, weights);

  return {
    baselineMargin,
    marginDeltaPct: Math.round(marginDeltaPct * 1000) / 10,
    projectedMargin: Math.round(projectedMargin * 10) / 10,
    baselineOpportunityScore,
    projectedOpportunityScore,
    riskDelta: projectedOpportunityScore < baselineOpportunityScore - 3 ? "higher" : projectedOpportunityScore > baselineOpportunityScore + 3 ? "lower" : "unchanged",
  };
}

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
