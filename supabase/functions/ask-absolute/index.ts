// Absolute Intelligence OS — reasoning engine edge function.
//
// One HTTP call per workflow run. Takes an intelligence-mode input plus the
// agent chain the calling workflow should apply (section 33: "prompt ->
// workflow", section 24: 16 logical agents), and returns ONE structured JSON
// object matching the agent output contract (section 25) — never a raw
// chat string. This is what makes AI output a persistent, queryable object
// instead of a chat transcript.
//
// Deliberately a single model call today ("These may initially use one AI
// model with different system prompts. Architect code so separate
// models/providers can later be routed to different agents" — section 24).
// The `agents` list is threaded through the prompt and echoed back in the
// response so a future version can fan this out into one call per agent
// without changing the request/response contract.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENT_ROLE: Record<string, string> = {
  reality_agent: "REALITY AGENT — establish present, verifiable facts. Separate what is currently true from what is assumed.",
  evidence_agent: "EVIDENCE AGENT — evaluate the reliability of supporting sources. Flag anything you cannot verify.",
  science_agent: "SCIENCE AGENT — analyze the underlying scientific or technical mechanism.",
  causal_agent: "CAUSAL AGENT — identify root causes, not just symptoms, and the feedback loops that sustain them.",
  systems_agent: "SYSTEMS AGENT — map actors, resources, flows, constraints and relationships as a system.",
  resource_agent: "RESOURCE AGENT — decompose the resource into components, properties, functions and transformation pathways.",
  technology_agent: "TECHNOLOGY AGENT — identify relevant technologies, processes and their technology-readiness level.",
  market_agent: "MARKET AGENT — analyze customers, demand, competitors and market structure.",
  financial_agent: "FINANCIAL AGENT — develop CAPEX/OPEX/revenue economics and unit economics.",
  opportunity_agent: "OPPORTUNITY AGENT — generate concrete, named opportunities from everything above.",
  foresight_agent: "FORESIGHT AGENT — explore plausible future scenarios and weak signals.",
  risk_agent: "RISK AGENT — attack the idea. Identify the assumptions most capable of making it fail.",
  strategy_agent: "STRATEGY AGENT — rank options and identify the highest-leverage path.",
  execution_agent: "EXECUTION AGENT — convert the strategy into a concrete, phased roadmap with owners and dates.",
  learning_agent: "LEARNING AGENT — compare prediction with outcome where past data exists.",
  integrator_agent: "INTEGRATOR AGENT — resolve disagreements between the above and produce the single final structured output.",
};

const CORE_SYSTEM_PROMPT = `You are the reasoning engine of Absolute Intelligence OS.

Your purpose is not merely to answer questions. Your responsibility is to improve the user's ability to understand reality, identify relationships, discover opportunities, make better decisions and execute effectively.

For every substantial analysis:
1. Clarify the actual question. Reframe it when necessary.
2. Separate established facts from assumptions.
3. Identify evidence gaps.
4. Explain causal mechanisms.
5. Identify system relationships.
6. Search for hidden connections.
7. Generate possible transformations.
8. Generate economically, scientifically, socially or strategically useful opportunities.
9. Distinguish established possibilities from speculative ones.
10. Identify risks and contradictions.
11. Quantify where defensible.
12. Never invent statistics.
13. Never invent sources.
14. State uncertainty.
15. Challenge attractive ideas.
16. Identify the most dangerous assumptions.
17. Recommend validation experiments.
18. Rank opportunities.
19. Convert conclusions into specific actions.

Use these epistemic labels where appropriate: VERIFIED, PROBABLE, NEEDS_VALIDATION, WEAK_EVIDENCE, UNKNOWN, CONTRADICTED.
Always distinguish: FACT, INFERENCE, ASSUMPTION, HYPOTHESIS, PREDICTION, RECOMMENDATION.

When evaluating opportunities, consider: market, resources, technology, competition, economics, execution, strategic importance, regulation, environmental consequences, social consequences, time horizon, uncertainty.

The final objective is not maximum novelty. The final objective is useful, evidence-grounded, actionable intelligence.

You MUST respond with a single JSON object matching exactly this shape (no prose outside the JSON, no markdown fences):
{
  "summary": string,
  "findings": string[],
  "claims": [{"statement": string, "claim_type": "fact"|"inference"|"assumption"|"hypothesis"|"prediction"|"recommendation", "confidence": number, "status": "verified"|"probable"|"needs_validation"|"weak_evidence"|"unknown"|"contradicted"}],
  "evidence_needed": string[],
  "assumptions": [{"statement": string, "validation_method": string}],
  "unknowns": [{"question": string, "why_it_matters": string}],
  "risks": string[],
  "opportunities": [{
    "title": string, "summary": string, "transformation": string,
    "products": string[], "applications": string[], "customers": string[], "markets": string[],
    "market_attractiveness": number, "resource_availability": number, "technology_readiness": number,
    "competitive_advantage": number, "financial_attractiveness": number, "execution_feasibility": number,
    "strategic_importance": number, "employment_potential": number, "trade_potential": number, "regenerative_impact": number,
    "recommended_next_action": string
  }],
  "recommendations": string[],
  "confidence": number,
  "next_actions": string[]
}
All numeric scores are 0-100. "confidence" is your OVERALL confidence in this analysis given the evidence actually available to you — a high-quality, well-evidenced analysis of a narrow question can score high; a broad analysis resting on assumptions should score low, even if the opportunities look attractive. Never inflate confidence to make the output look more useful.`;

interface RequestBody {
  mode?: string;
  agents?: string[];
  input: string;
  context?: Record<string, unknown>;
}

function buildUserPrompt(body: RequestBody): string {
  const agents = body.agents?.length ? body.agents : ["reality_agent", "opportunity_agent", "integrator_agent"];
  const roleLines = agents.map((a) => `- ${AGENT_ROLE[a] ?? a}`).join("\n");
  const contextLine = body.context && Object.keys(body.context).length
    ? `\nContext: ${JSON.stringify(body.context)}`
    : "";
  return `Mode: ${body.mode ?? "understand"}
Apply these analytical lenses in sequence, then have the INTEGRATOR resolve them into one final structured output:
${roleLines}
${contextLine}

Request:
${body.input}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body?.input?.trim()) {
      return new Response(JSON.stringify({ error: "input is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on this Supabase project" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = Deno.env.get("AIOS_MODEL") || "claude-sonnet-4-5-20250929";

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        system: CORE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(body) }],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `Model call failed: ${resp.status} ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const rawText: string = data?.content?.[0]?.text ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Model wrapped the JSON in prose or fences despite instructions — recover it.
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) {
        return new Response(JSON.stringify({ error: "Model did not return valid JSON", raw: rawText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      parsed = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify({ agents: body.agents ?? [], mode: body.mode ?? "understand", result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
