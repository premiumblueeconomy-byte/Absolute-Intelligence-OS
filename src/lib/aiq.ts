import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type AiqAssessment = Database["public"]["Tables"]["aiq_assessments"]["Row"];

export type AiqDomain =
  | "realityIntelligence" | "evidenceIntelligence" | "causalIntelligence" | "systemsIntelligence"
  | "foresightIntelligence" | "creativeIntelligence" | "opportunityIntelligence" | "strategicIntelligence"
  | "executionIntelligence" | "learningWisdom";

export const AIQ_DOMAIN_LABEL: Record<AiqDomain, string> = {
  realityIntelligence: "Reality Intelligence",
  evidenceIntelligence: "Evidence Intelligence",
  causalIntelligence: "Causal Intelligence",
  systemsIntelligence: "Systems Intelligence",
  foresightIntelligence: "Foresight Intelligence",
  creativeIntelligence: "Creative Intelligence",
  opportunityIntelligence: "Opportunity Intelligence",
  strategicIntelligence: "Strategic Intelligence",
  executionIntelligence: "Execution Intelligence",
  learningWisdom: "Learning & Wisdom",
};

export interface AiqQuestion {
  id: string;
  domain: AiqDomain;
  statement: string;
}

// 2 statements per domain, each self-rated 1 (rarely) – 5 (almost always).
export const AIQ_QUESTIONS: AiqQuestion[] = [
  { id: "reality-1", domain: "realityIntelligence", statement: "Before forming a view, I check what is actually happening rather than what I assume is happening." },
  { id: "reality-2", domain: "realityIntelligence", statement: "I can clearly separate confirmed facts from things I merely believe to be true." },
  { id: "evidence-1", domain: "evidenceIntelligence", statement: "I ask for the source and reliability of a claim before acting on it." },
  { id: "evidence-2", domain: "evidenceIntelligence", statement: "I notice when a conclusion is not actually supported by the evidence given for it." },
  { id: "causal-1", domain: "causalIntelligence", statement: "When something goes wrong, I look for root causes rather than the nearest visible symptom." },
  { id: "causal-2", domain: "causalIntelligence", statement: "I can trace how one change ripples into second- and third-order effects." },
  { id: "systems-1", domain: "systemsIntelligence", statement: "I naturally map the actors, incentives and feedback loops around a problem, not just the problem itself." },
  { id: "systems-2", domain: "systemsIntelligence", statement: "I can explain how a system's parts reinforce or undermine each other." },
  { id: "foresight-1", domain: "foresightIntelligence", statement: "I regularly consider multiple plausible futures rather than a single expected one." },
  { id: "foresight-2", domain: "foresightIntelligence", statement: "I notice weak signals today that could matter a great deal in five to ten years." },
  { id: "creative-1", domain: "creativeIntelligence", statement: "I can find unexpected connections between apparently unrelated fields." },
  { id: "creative-2", domain: "creativeIntelligence", statement: "I generate several genuinely different options before settling on one." },
  { id: "opportunity-1", domain: "opportunityIntelligence", statement: "I can spot a valuable opportunity that other people looking at the same information miss." },
  { id: "opportunity-2", domain: "opportunityIntelligence", statement: "I evaluate opportunities on market, resources, technology and execution together, not just one dimension." },
  { id: "strategic-1", domain: "strategicIntelligence", statement: "I can rank competing priorities by leverage, not just urgency." },
  { id: "strategic-2", domain: "strategicIntelligence", statement: "I think several moves ahead about how others will react to a decision." },
  { id: "execution-1", domain: "executionIntelligence", statement: "I turn plans into specific tasks with owners and dates, not just intentions." },
  { id: "execution-2", domain: "executionIntelligence", statement: "I actually follow through and ship, even when a plan isn't perfect." },
  { id: "learning-1", domain: "learningWisdom", statement: "I compare what I predicted against what actually happened, and update accordingly." },
  { id: "learning-2", domain: "learningWisdom", statement: "I can name specific ways my thinking has changed based on past mistakes." },
];

export interface AiqClassification { band: string; range: string }

export function classify(score: number): AiqClassification {
  if (score >= 97) return { band: "Theoretical Absolute Intelligence", range: "97–100" };
  if (score >= 90) return { band: "Exceptional Integrated Intelligence", range: "90–96" };
  if (score >= 80) return { band: "Advanced Intelligence", range: "80–89" };
  if (score >= 70) return { band: "Strategic", range: "70–79" };
  if (score >= 55) return { band: "Systemic", range: "55–69" };
  if (score >= 40) return { band: "Analytical", range: "40–54" };
  if (score >= 20) return { band: "Informational", range: "20–39" };
  return { band: "Reactive", range: "0–19" };
}

const EXERCISE: Record<AiqDomain, string> = {
  realityIntelligence: "Before your next decision, write down what you know versus what you're assuming — then go verify one assumption.",
  evidenceIntelligence: "Pick a belief you hold strongly and find the single best piece of evidence against it.",
  causalIntelligence: "Take a recent problem and draw its causal chain back three levels, not just the first cause you notice.",
  systemsIntelligence: "Map the actors and incentives around a current project using the System Mapping Studio.",
  foresightIntelligence: "Build a Scenario Lab adverse case for your top opportunity and see how it holds up.",
  creativeIntelligence: "Use Ask Absolute's Discover mode on a resource and force yourself to list 10 unconventional applications.",
  opportunityIntelligence: "Run the Resource Explorer or Problem Explorer on something you'd normally overlook.",
  strategicIntelligence: "Rank your open opportunities by opportunity score AND confidence score together, not opportunity score alone.",
  executionIntelligence: "Take your highest-scored opportunity and build its 12-month execution plan in the Execution tab.",
  learningWisdom: "Revisit an experiment you ran and write down what you'd do differently now.",
};

export function computeResults(answers: Record<string, number>): { domainScores: Record<AiqDomain, number>; overall: number } {
  const domainScores = {} as Record<AiqDomain, number>;
  const domains = [...new Set(AIQ_QUESTIONS.map((q) => q.domain))];
  for (const domain of domains) {
    const qs = AIQ_QUESTIONS.filter((q) => q.domain === domain);
    const sum = qs.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);
    const avg = qs.length ? sum / qs.length : 0; // 0-5
    domainScores[domain] = Math.round((avg / 5) * 10 * 10) / 10; // 0-10
  }
  const overall = Math.round(Object.values(domainScores).reduce((a, b) => a + b, 0) * 10) / 10;
  return { domainScores, overall };
}

export function strengthsAndWeaknesses(domainScores: Record<AiqDomain, number>): { strengths: AiqDomain[]; weaknesses: AiqDomain[] } {
  const entries = Object.entries(domainScores) as [AiqDomain, number][];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  return {
    strengths: sorted.slice(0, 3).map(([d]) => d),
    weaknesses: sorted.slice(-3).reverse().map(([d]) => d),
  };
}

export function recommendedExercises(weaknesses: AiqDomain[]): string[] {
  return weaknesses.map((d) => `${AIQ_DOMAIN_LABEL[d]}: ${EXERCISE[d]}`);
}

export async function saveAssessment(answers: Record<string, number>): Promise<AiqAssessment> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { domainScores, overall } = computeResults(answers);
  const { data, error } = await supabase
    .from("aiq_assessments")
    .insert({
      user_id: auth.user.id,
      answers: answers as unknown as Json,
      domain_scores: domainScores as unknown as Json,
      overall_score: overall,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listAssessments(): Promise<AiqAssessment[]> {
  const { data, error } = await supabase.from("aiq_assessments").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
