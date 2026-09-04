import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { AgentOpportunity, AgentAssumption, AgentUnknown, AgentClaim } from "@/lib/ask-absolute";
import { computeOpportunityScore, DEFAULT_WEIGHTS, type ScoreDimensions } from "@/lib/scoring";

export type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
export type Assumption = Database["public"]["Tables"]["assumptions"]["Row"];
export type Unknown_ = Database["public"]["Tables"]["unknowns"]["Row"];
export type Claim = Database["public"]["Tables"]["claims"]["Row"];
export type Evidence = Database["public"]["Tables"]["evidence"]["Row"];

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

function dims(o: AgentOpportunity): ScoreDimensions {
  return {
    marketAttractiveness: o.market_attractiveness ?? 0,
    resourceAvailability: o.resource_availability ?? 0,
    technologyReadiness: o.technology_readiness ?? 0,
    competitiveAdvantage: o.competitive_advantage ?? 0,
    financialAttractiveness: o.financial_attractiveness ?? 0,
    executionFeasibility: o.execution_feasibility ?? 0,
    strategicImportance: o.strategic_importance ?? 0,
    employmentPotential: o.employment_potential ?? 0,
    tradePotential: o.trade_potential ?? 0,
    regenerativeImpact: o.regenerative_impact ?? 0,
  };
}

/** Persist AI-generated opportunities (from an AgentOutput) as real, queryable rows. */
export async function persistOpportunities(input: {
  projectId: string;
  sourceType: "resource" | "problem" | "technology" | "research" | "manual";
  sourceResourceId?: string;
  sourceProblemId?: string;
  geography?: Json;
  opportunities: AgentOpportunity[];
  confidenceScore: number;
  weights?: Record<keyof ScoreDimensions, number>;
}): Promise<Opportunity[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");

  const rows = input.opportunities.map((o) => ({
    project_id: input.projectId,
    user_id: auth.user!.id,
    source_resource_id: input.sourceResourceId ?? null,
    source_problem_id: input.sourceProblemId ?? null,
    source_type: input.sourceType,
    title: o.title,
    slug: slugify(o.title),
    summary: o.summary,
    geography: input.geography ?? {},
    transformation: o.transformation ?? "",
    products: o.products ?? [],
    applications: o.applications ?? [],
    customers: o.customers ?? [],
    markets: o.markets ?? [],
    market_attractiveness: o.market_attractiveness ?? 0,
    resource_availability: o.resource_availability ?? 0,
    technology_readiness: o.technology_readiness ?? 0,
    competitive_advantage: o.competitive_advantage ?? 0,
    financial_attractiveness: o.financial_attractiveness ?? 0,
    execution_feasibility: o.execution_feasibility ?? 0,
    strategic_importance: o.strategic_importance ?? 0,
    employment_potential: o.employment_potential ?? 0,
    trade_potential: o.trade_potential ?? 0,
    regenerative_impact: o.regenerative_impact ?? 0,
    opportunity_score: computeOpportunityScore(dims(o), input.weights ?? DEFAULT_WEIGHTS),
    confidence_score: input.confidenceScore,
    recommended_next_action: o.recommended_next_action ?? "",
    status: "discovered" as const,
  }));

  const { data, error } = await supabase.from("opportunities").insert(rows).select("*");
  if (error) throw error;
  return data ?? [];
}

export async function persistAssumptions(opportunityId: string, assumptions: AgentAssumption[]): Promise<void> {
  if (!assumptions.length) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { error } = await supabase.from("assumptions").insert(
    assumptions.map((a) => ({
      opportunity_id: opportunityId,
      user_id: auth.user!.id,
      statement: a.statement,
      validation_method: a.validation_method ?? "",
    })),
  );
  if (error) throw error;
}

export async function persistUnknowns(opportunityId: string, unknowns: AgentUnknown[]): Promise<void> {
  if (!unknowns.length) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { error } = await supabase.from("unknowns").insert(
    unknowns.map((u) => ({
      opportunity_id: opportunityId,
      user_id: auth.user!.id,
      question: u.question,
      why_it_matters: u.why_it_matters ?? "",
    })),
  );
  if (error) throw error;
}

export async function persistClaims(projectId: string, opportunityId: string | null, claims: AgentClaim[]): Promise<void> {
  if (!claims.length) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { error } = await supabase.from("claims").insert(
    claims.map((c) => ({
      project_id: projectId,
      opportunity_id: opportunityId,
      user_id: auth.user!.id,
      statement: c.statement,
      claim_type: c.claim_type,
      confidence: c.confidence ?? 0,
      status: c.status,
    })),
  );
  if (error) throw error;
}

export async function listOpportunities(projectId: string): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("project_id", projectId)
    .order("opportunity_score", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAllOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase.from("opportunities").select("*").order("opportunity_score", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const { data, error } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateOpportunityStatus(id: string, status: Opportunity["status"]): Promise<void> {
  const { error } = await supabase.from("opportunities").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function updateOpportunityWeights(id: string, dimsIn: ScoreDimensions, weights: Record<keyof ScoreDimensions, number>): Promise<number> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const score = computeOpportunityScore(dimsIn, weights);
  const { error: updateError } = await supabase.from("opportunities").update({ opportunity_score: score }).eq("id", id);
  if (updateError) throw updateError;
  const { error: historyError } = await supabase.from("opportunity_scores").insert({
    opportunity_id: id,
    user_id: auth.user.id,
    weights,
    computed_score: score,
  });
  if (historyError) throw historyError;
  return score;
}

export async function listAssumptions(opportunityId: string): Promise<Assumption[]> {
  const { data, error } = await supabase.from("assumptions").select("*").eq("opportunity_id", opportunityId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listUnknowns(opportunityId: string): Promise<Unknown_[]> {
  const { data, error } = await supabase.from("unknowns").select("*").eq("opportunity_id", opportunityId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listClaims(opportunityId: string): Promise<Claim[]> {
  const { data, error } = await supabase.from("claims").select("*").eq("opportunity_id", opportunityId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listEvidence(opportunityId: string): Promise<Evidence[]> {
  const { data, error } = await supabase.from("evidence").select("*").eq("opportunity_id", opportunityId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export function opportunityDims(o: Opportunity): ScoreDimensions {
  return {
    marketAttractiveness: o.market_attractiveness,
    resourceAvailability: o.resource_availability,
    technologyReadiness: o.technology_readiness,
    competitiveAdvantage: o.competitive_advantage,
    financialAttractiveness: o.financial_attractiveness,
    executionFeasibility: o.execution_feasibility,
    strategicImportance: o.strategic_importance,
    employmentPotential: o.employment_potential,
    tradePotential: o.trade_potential,
    regenerativeImpact: o.regenerative_impact,
  };
}
