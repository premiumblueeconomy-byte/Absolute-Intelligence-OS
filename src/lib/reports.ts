import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Opportunity } from "@/lib/opportunities";
import type { Project } from "@/lib/projects";
import { listAssumptions, listUnknowns, listClaims, listEvidence } from "@/lib/opportunities";
import { readinessLabel } from "@/lib/scoring";

export type Report = Database["public"]["Tables"]["reports"]["Row"];

/** The Absolute Intelligence Report format — spec section 44, trimmed to what Phase 1 can populate. */
export interface ReportContent {
  title: string;
  generatedAt: string;
  executiveSummary: string;
  currentReality: string;
  criticalFacts: string[];
  assumptions: { statement: string; validation_method: string }[];
  unknowns: { question: string; why_it_matters: string }[];
  opportunityPortfolio: {
    title: string;
    summary: string;
    opportunityScore: number;
    confidenceScore: number;
    readiness: string;
    recommendedNextAction: string;
  }[];
  evidenceSummary: { source: string; status: string; confidence: number }[];
  next30Days: string[];
  next90Days: string[];
  confidenceSummary: string;
}

export async function assembleOpportunityReport(project: Project, opportunity: Opportunity): Promise<ReportContent> {
  const [assumptions, unknowns, claims, evidence] = await Promise.all([
    listAssumptions(opportunity.id),
    listUnknowns(opportunity.id),
    listClaims(opportunity.id),
    listEvidence(opportunity.id),
  ]);

  const readiness = readinessLabel(opportunity.opportunity_score);

  return {
    title: `${opportunity.title} — Absolute Intelligence Report`,
    generatedAt: new Date().toISOString(),
    executiveSummary: opportunity.summary,
    currentReality: project.objective || "No stated objective on this project yet.",
    criticalFacts: claims.filter((c) => c.claim_type === "fact").map((c) => c.statement),
    assumptions: assumptions.map((a) => ({ statement: a.statement, validation_method: a.validation_method })),
    unknowns: unknowns.map((u) => ({ question: u.question, why_it_matters: u.why_it_matters })),
    opportunityPortfolio: [
      {
        title: opportunity.title,
        summary: opportunity.summary,
        opportunityScore: opportunity.opportunity_score,
        confidenceScore: opportunity.confidence_score,
        readiness: readiness.label,
        recommendedNextAction: opportunity.recommended_next_action,
      },
    ],
    evidenceSummary: evidence.map((e) => ({ source: e.source || e.source_url || "Unattributed", status: e.status, confidence: e.confidence })),
    next30Days: [opportunity.recommended_next_action || "Define the validation plan for the highest-risk assumption."],
    next90Days: ["Run the experiment(s) required to resolve the top unknowns.", "Re-score the opportunity once new evidence is in."],
    confidenceSummary: `Opportunity score ${opportunity.opportunity_score}/100. Confidence ${opportunity.confidence_score}/100 — ${
      opportunity.confidence_score < 50
        ? "an attractive-looking opportunity is not yet investment-ready; treat the score as a hypothesis."
        : "reasonably evidence-backed for its current pipeline stage."
    }`,
  };
}

export async function saveReport(input: { projectId: string; opportunityId?: string; title: string; content: ReportContent }): Promise<Report> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("reports")
    .insert({
      project_id: input.projectId,
      opportunity_id: input.opportunityId ?? null,
      user_id: auth.user.id,
      title: input.title,
      format: "web",
      content: input.content as unknown as import("@/integrations/supabase/types").Json,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listReports(projectId: string): Promise<Report[]> {
  const { data, error } = await supabase.from("reports").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
