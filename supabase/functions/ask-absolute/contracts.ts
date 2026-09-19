import { z } from 'zod';
const score = z.number().finite().min(0).max(100);
const texts = z.array(z.string().max(6000)).max(40);
export const opportunitySchema = z.object({
  title: z.string().trim().min(1).max(300), summary: z.string().min(1).max(6000),
  transformation: z.string(), products: texts, applications: texts, customers: texts, markets: texts,
  market_attractiveness: score, resource_availability: score, technology_readiness: score,
  competitive_advantage: score, financial_attractiveness: score, execution_feasibility: score,
  strategic_importance: score, employment_potential: score, trade_potential: score, regenerative_impact: score,
  recommended_next_action: z.string(),
});
export const outputSchema = z.object({
  summary: z.string().min(1), findings: texts,
  claims: z.array(z.object({ statement: z.string(),
    claim_type: z.enum(['fact','inference','assumption','hypothesis','prediction','recommendation']),
    confidence: score,
    status: z.enum(['verified','probable','needs_validation','weak_evidence','unknown','contradicted']),
  })).max(40),
  evidence_needed: texts,
  assumptions: z.array(z.object({ statement: z.string(), validation_method: z.string() })).max(40),
  unknowns: z.array(z.object({ question: z.string(), why_it_matters: z.string() })).max(40),
  risks: texts, opportunities: z.array(opportunitySchema).max(5),
  recommendations: texts, confidence: score, next_actions: texts,
});
export const briefSchema = z.object({ summary: z.string().min(1), findings: texts, candidates: texts, risks: texts, evidence_gaps: texts });
export const reviewSchema = z.object({ disagreements: texts, rejected_ideas: texts, required_corrections: texts, validation_priorities: texts });
