import { computeOpportunityScore, DEFAULT_WEIGHTS, type ScoreDimensions } from './scoring.ts';
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


