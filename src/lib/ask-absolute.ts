import { supabase } from "@/integrations/supabase/client";

export interface AgentClaim {
  statement: string;
  claim_type: "fact" | "inference" | "assumption" | "hypothesis" | "prediction" | "recommendation";
  confidence: number;
  status: "verified" | "probable" | "needs_validation" | "weak_evidence" | "unknown" | "contradicted";
}

export interface AgentAssumption {
  statement: string;
  validation_method: string;
}

export interface AgentUnknown {
  question: string;
  why_it_matters: string;
}

export interface AgentOpportunity {
  title: string;
  summary: string;
  transformation: string;
  products: string[];
  applications: string[];
  customers: string[];
  markets: string[];
  market_attractiveness: number;
  resource_availability: number;
  technology_readiness: number;
  competitive_advantage: number;
  financial_attractiveness: number;
  execution_feasibility: number;
  strategic_importance: number;
  employment_potential: number;
  trade_potential: number;
  regenerative_impact: number;
  recommended_next_action: string;
}

/** The agent output contract — section 25 of the spec. */
export interface AgentOutput {
  summary: string;
  findings: string[];
  claims: AgentClaim[];
  evidence_needed: string[];
  assumptions: AgentAssumption[];
  unknowns: AgentUnknown[];
  risks: string[];
  opportunities: AgentOpportunity[];
  recommendations: string[];
  confidence: number;
  next_actions: string[];
}

export interface AskAbsoluteResponse {
  agents: string[];
  mode: string;
  result: AgentOutput;
}

export async function runIntelligenceWorkflow(input: {
  mode: string;
  agents: string[];
  prompt: string;
  context?: Record<string, unknown>;
}): Promise<AgentOutput> {
  const { data, error } = await supabase.functions.invoke<AskAbsoluteResponse>("ask-absolute", {
    body: { mode: input.mode, agents: input.agents, input: input.prompt, context: input.context },
  });
  if (error) throw error;
  if (!data?.result) throw new Error("No result returned from the reasoning engine");
  return data.result;
}
