import { runIntelligenceWorkflow, type AgentOutput } from "@/lib/ask-absolute";
import { persistOpportunities, persistAssumptions, persistUnknowns, persistClaims, type Opportunity } from "@/lib/opportunities";

const UNLOCK_AGENTS = ["systems_agent", "resource_agent", "technology_agent", "opportunity_agent", "integrator_agent"];

/**
 * Signature "UNLOCK FURTHER" interaction: "What have we not yet considered?"
 * Searches for overlooked properties, unexpected industry connections,
 * adjacent technologies, substitute materials, secondary markets, waste
 * utilization, research gaps, geographic arbitrage, capability reuse,
 * circular loops and future scenarios — then appends new, distinct
 * opportunities rather than repeating what's already been found.
 */
export async function unlockFurther(opportunity: Opportunity): Promise<{ result: AgentOutput; created: Opportunity[] }> {
  const prompt = `We have already discovered this opportunity — do not repeat it, go further:

"${opportunity.title}": ${opportunity.summary}
Transformation: ${opportunity.transformation}
Products so far: ${opportunity.products.join(", ") || "none listed"}

What have we not yet considered? Specifically search for: overlooked properties, unexpected
industry connections, adjacent technologies, substitute materials, secondary markets, waste
utilization, research gaps, geographic arbitrage, capability reuse, circular loops, and future
scenarios. Generate 3-6 NEW, genuinely distinct opportunities this analysis missed.`;

  const result = await runIntelligenceWorkflow({
    mode: "discover",
    agents: UNLOCK_AGENTS,
    prompt,
    context: { opportunityId: opportunity.id, unlockFurther: true },
  });

  const created = await persistOpportunities({
    projectId: opportunity.project_id,
    sourceType: opportunity.source_type,
    sourceResourceId: opportunity.source_resource_id ?? undefined,
    sourceProblemId: opportunity.source_problem_id ?? undefined,
    geography: opportunity.geography,
    opportunities: result.opportunities,
    confidenceScore: result.confidence,
  });
  for (const o of created) {
    await persistAssumptions(o.id, result.assumptions);
    await persistUnknowns(o.id, result.unknowns);
  }
  await persistClaims(opportunity.project_id, created[0]?.id ?? null, result.claims);

  return { result, created };
}
