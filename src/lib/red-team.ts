import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { runIntelligenceWorkflow, type AgentOutput } from "@/lib/ask-absolute";
import type { Opportunity } from "@/lib/opportunities";

export type RedTeamRun = Database["public"]["Tables"]["red_team_runs"]["Row"];

export const RED_TEAM_PERSPECTIVES = [
  "Skeptical Investor", "Engineer", "Scientist", "Customer", "Competitor",
  "Regulator", "Financial Analyst", "Environmental Analyst", "Operator", "Supply Chain Analyst",
];

const RED_TEAM_AGENTS = ["risk_agent", "financial_agent", "technology_agent", "market_agent", "integrator_agent"];

/** "Attack This Idea" (spec section 15). */
export async function runRedTeam(opportunity: Opportunity): Promise<{ run: RedTeamRun; result: AgentOutput }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");

  const prompt = `Attack this opportunity from ten adversarial perspectives: ${RED_TEAM_PERSPECTIVES.join(", ")}.

Opportunity: "${opportunity.title}"
Summary: ${opportunity.summary}
Transformation: ${opportunity.transformation}
Products: ${opportunity.products.join(", ") || "none listed"}
Markets: ${opportunity.markets.join(", ") || "none listed"}
Recommended next action: ${opportunity.recommended_next_action}

For each perspective that finds a real problem, prefix the finding with "<PERSPECTIVE>: " in the
"risks" array (e.g. "SKEPTICAL INVESTOR: ..."). Cover critical vulnerabilities, weak assumptions,
missing evidence, and technical/market/financial/regulatory/operational/environmental/competitive
risks. Put "Conditions required for success" statements in "recommendations". Put "Experiments
required before investment" in "next_actions". Be genuinely adversarial — the point is to find
what could make this fail, not to be encouraging.`;

  const result = await runIntelligenceWorkflow({
    mode: "challenge",
    agents: RED_TEAM_AGENTS,
    prompt,
    context: { opportunityId: opportunity.id },
  });

  const { data: run, error } = await supabase
    .from("red_team_runs")
    .insert({
      opportunity_id: opportunity.id,
      user_id: auth.user.id,
      perspectives: RED_TEAM_PERSPECTIVES,
      result: result as unknown as Json,
    })
    .select("*")
    .single();
  if (error) throw error;

  return { run, result };
}

export async function listRedTeamRuns(opportunityId: string): Promise<RedTeamRun[]> {
  const { data, error } = await supabase
    .from("red_team_runs")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Group a red-team result's "PERSPECTIVE: finding" risk lines by perspective for display. */
export function groupRisksByPerspective(risks: string[]): { perspective: string; findings: string[] }[] {
  const groups = new Map<string, string[]>();
  const general: string[] = [];
  for (const risk of risks) {
    const match = risk.match(/^([A-Z][A-Z /]{2,40}):\s*(.+)$/);
    if (match) {
      const [, perspective, finding] = match;
      const key = perspective.trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(finding.trim());
    } else {
      general.push(risk);
    }
  }
  const out = [...groups.entries()].map(([perspective, findings]) => ({ perspective, findings }));
  if (general.length) out.push({ perspective: "General", findings: general });
  return out;
}
