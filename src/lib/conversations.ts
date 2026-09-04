import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { runIntelligenceWorkflow, type AgentOutput } from "@/lib/ask-absolute";
import { persistOpportunities, persistAssumptions, persistUnknowns, persistClaims } from "@/lib/opportunities";

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type ConversationMode = Database["public"]["Tables"]["conversations"]["Row"]["mode"];

/** Mode -> default agent chain (section 6: the 10 Ask Absolute modes). */
export const MODE_AGENTS: Record<ConversationMode, string[]> = {
  understand: ["reality_agent", "science_agent", "integrator_agent"],
  investigate: ["reality_agent", "evidence_agent", "causal_agent", "integrator_agent"],
  map: ["systems_agent", "causal_agent", "integrator_agent"],
  discover: ["resource_agent", "opportunity_agent", "market_agent", "integrator_agent"],
  compare: ["market_agent", "financial_agent", "strategy_agent", "integrator_agent"],
  challenge: ["risk_agent", "financial_agent", "integrator_agent"],
  forecast: ["foresight_agent", "risk_agent", "integrator_agent"],
  build: ["strategy_agent", "execution_agent", "integrator_agent"],
  invest: ["financial_agent", "risk_agent", "strategy_agent", "integrator_agent"],
  learn: ["learning_agent", "integrator_agent"],
};

export const MODE_LABEL: Record<ConversationMode, string> = {
  understand: "Understand", investigate: "Investigate", map: "Map", discover: "Discover",
  compare: "Compare", challenge: "Challenge", forecast: "Forecast", build: "Build",
  invest: "Invest", learn: "Learn",
};

export const QUESTION_THE_QUESTION_AGENTS = ["reality_agent", "risk_agent", "integrator_agent"];

/**
 * Signature "QUESTION THE QUESTION" interaction: don't just answer — reframe.
 * Reuses the same AgentOutput contract: summary carries the deeper/reframed
 * question, findings carry the hidden assumptions the original question
 * presumes, risks carry what may be missing, recommendations carry
 * alternative framings, next_actions carries the recommended investigation.
 */
export function buildQuestionTheQuestionPrompt(originalQuestion: string): string {
  return `Do not simply answer this question. Reframe it, identify what I may be missing, expose hidden assumptions and determine the deeper question I should be asking:

"${originalQuestion}"

Put the single most valuable reframed question in "summary". Put the hidden assumptions the
original question presumes in "findings". Put what may be missing in "risks". Put alternative
framings (including a system-level framing) in "recommendations". Put the recommended
investigation for the reframed question in "next_actions".`;
}

export async function createConversation(input: { projectId?: string; mode: ConversationMode; title?: string }): Promise<Conversation> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("conversations")
    .insert({ project_id: input.projectId ?? null, user_id: auth.user.id, mode: input.mode, title: input.title ?? "New conversation" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listConversations(projectId?: string): Promise<Conversation[]> {
  let query = supabase.from("conversations").select("*").order("updated_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** Send a message, run the workflow, persist the assistant's structured reply. */
export async function sendMessage(input: {
  conversationId: string;
  projectId?: string;
  mode: ConversationMode;
  content: string;
  context?: Record<string, unknown>;
  /** Override what's actually sent to the reasoning engine (the displayed/stored user message stays `content`). */
  promptOverride?: string;
  agentsOverride?: string[];
}): Promise<{ userMessage: Message; assistantMessage: Message; result: AgentOutput }> {
  const { data: userMessage, error: userError } = await supabase
    .from("messages")
    .insert({ conversation_id: input.conversationId, role: "user", content: input.content })
    .select("*")
    .single();
  if (userError) throw userError;

  const result = await runIntelligenceWorkflow({
    mode: input.mode,
    agents: input.agentsOverride ?? MODE_AGENTS[input.mode],
    prompt: input.promptOverride ?? input.content,
    context: input.context,
  });

  const { data: assistantMessage, error: assistantError } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      role: "assistant",
      content: result.summary,
      structured: result as unknown as import("@/integrations/supabase/types").Json,
    })
    .select("*")
    .single();
  if (assistantError) throw assistantError;

  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", input.conversationId);

  return { userMessage, assistantMessage, result };
}

/** "Create Opportunity" action button (section 6): persist one AI-surfaced opportunity from a chat turn. */
export async function saveOpportunityFromMessage(input: {
  projectId: string;
  result: AgentOutput;
  opportunityIndex: number;
}): Promise<void> {
  const opp = input.result.opportunities[input.opportunityIndex];
  if (!opp) throw new Error("No such opportunity in this message");
  const created = await persistOpportunities({
    projectId: input.projectId,
    sourceType: "manual",
    opportunities: [opp],
    confidenceScore: input.result.confidence,
  });
  for (const o of created) {
    await persistAssumptions(o.id, input.result.assumptions);
    await persistUnknowns(o.id, input.result.unknowns);
  }
  await persistClaims(input.projectId, created[0]?.id ?? null, input.result.claims);
}
