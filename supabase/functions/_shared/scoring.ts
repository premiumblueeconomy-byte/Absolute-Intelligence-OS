// Opportunity scoring engine (spec section 12 / "Opportunity scoring function").
//
// Score = 0.15*M + 0.10*R + 0.10*T + 0.10*C + 0.15*F + 0.10*E + 0.10*S
//       + 0.05*J + 0.05*X + 0.10*G   (each input 0-100)
//
// The Opportunity Score and Confidence Score are ALWAYS shown separately.
// Never hide low confidence behind a high opportunity score.

export interface ScoreDimensions {
  marketAttractiveness: number;
  resourceAvailability: number;
  technologyReadiness: number;
  competitiveAdvantage: number;
  financialAttractiveness: number;
  executionFeasibility: number;
  strategicImportance: number;
  employmentPotential: number;
  tradePotential: number;
  regenerativeImpact: number;
}

export const DIMENSION_LABEL: Record<keyof ScoreDimensions, string> = {
  marketAttractiveness: "Market attractiveness",
  resourceAvailability: "Resource availability",
  technologyReadiness: "Technology readiness",
  competitiveAdvantage: "Competitive advantage",
  financialAttractiveness: "Financial attractiveness",
  executionFeasibility: "Execution feasibility",
  strategicImportance: "Strategic importance",
  employmentPotential: "Employment potential",
  tradePotential: "Export / import substitution",
  regenerativeImpact: "Regenerative impact",
};

export const DEFAULT_WEIGHTS: Record<keyof ScoreDimensions, number> = {
  marketAttractiveness: 15,
  resourceAvailability: 10,
  technologyReadiness: 10,
  competitiveAdvantage: 10,
  financialAttractiveness: 15,
  executionFeasibility: 10,
  strategicImportance: 10,
  employmentPotential: 5,
  tradePotential: 5,
  regenerativeImpact: 10,
};

export function totalWeight(weights: Record<string, number>): number {
  return Object.values(weights).reduce((a, b) => a + b, 0);
}

/** Weighted 0-100 opportunity score. Weights are normalized so they need not sum to exactly 100. */
export function computeOpportunityScore(dims: ScoreDimensions, weights: Record<keyof ScoreDimensions, number> = DEFAULT_WEIGHTS): number {
  const total = totalWeight(weights) || 1;
  let sum = 0;
  for (const key of Object.keys(DEFAULT_WEIGHTS) as (keyof ScoreDimensions)[]) {
    const w = weights[key] ?? 0;
    const v = dims[key] ?? 0;
    sum += (w / total) * v;
  }
  return Math.round(sum * 10) / 10;
}

/**
 * Confidence score: a separate rollup of evidence quality, NOT a component
 * of the opportunity score. Computed from the ratio of VERIFIED/PROBABLE
 * evidence to total evidence attached, discounted by unresolved unknowns.
 */
export function computeConfidenceScore(opts: {
  evidenceStatuses: string[];
  unresolvedUnknowns: number;
  unvalidatedAssumptions: number;
}): number {
  const { evidenceStatuses, unresolvedUnknowns, unvalidatedAssumptions } = opts;
  if (evidenceStatuses.length === 0) return 0;
  const weight: Record<string, number> = {
    verified: 1, probable: 0.7, needs_validation: 0.35, weak_evidence: 0.15, unknown: 0.05, contradicted: -0.5,
  };
  const raw = evidenceStatuses.reduce((sum, s) => sum + (weight[s] ?? 0), 0) / evidenceStatuses.length;
  const penalty = Math.min(0.4, unresolvedUnknowns * 0.03 + unvalidatedAssumptions * 0.02);
  return Math.max(0, Math.round((raw - penalty) * 1000) / 10);
}

export function readinessLabel(score: number): { label: string; band: string } {
  if (score >= 80) return { label: "Commercial-ready", band: "scale" };
  if (score >= 60) return { label: "Pilot-ready", band: "pilot" };
  if (score >= 35) return { label: "Validation stage", band: "validating" };
  return { label: "Early hypothesis", band: "hypothesis" };
}
