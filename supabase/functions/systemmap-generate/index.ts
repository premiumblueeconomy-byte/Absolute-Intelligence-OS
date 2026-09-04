// AI-assisted System Map generation (spec section 17's "AI-assisted
// generation"). Given a subject (project objective and/or an opportunity),
// returns a proposed set of system nodes and typed relationships — the
// client resolves them into real system_nodes/system_edges rows via the
// same addNode/addEdge functions a human uses when building a map by hand.
//
// Uses DeepSeek's chat completions API (OpenAI-compatible shape: Bearer
// auth, choices[0].message.content), not Anthropic's Messages API.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NODE_TYPES = [
  "actor", "resource", "problem", "technology", "product", "market",
  "institution", "company", "community", "policy", "infrastructure",
  "waste", "knowledge", "capital", "constraint",
];

const RELATIONSHIP_TYPES = [
  "causes", "enables", "depends_on", "produces", "consumes", "transforms",
  "finances", "regulates", "supplies", "buys", "competes_with",
  "substitutes", "inhibits", "amplifies", "reduces",
];

const SYSTEM_PROMPT = `You are the Systems Agent of Absolute Intelligence OS, building a system map:
actors, resources, flows, constraints and feedback loops around a subject.

Never invent specific named organizations or people you cannot reasonably infer exist from the
subject description — use role/category labels (e.g. "Local cooperative", "Regulator") unless a
specific real entity is clearly implied by the input. Keep the map focused: 8-16 nodes, each
genuinely distinct, connected by relationships that reflect real causal/economic/informational
structure, not decorative connections.

Respond with a single JSON object matching exactly this shape (no prose outside the JSON, no
markdown fences):
{
  "nodes": [{"label": string, "nodeType": one of ${JSON.stringify(NODE_TYPES)}}],
  "edges": [{"sourceLabel": string, "targetLabel": string, "relationshipType": one of ${JSON.stringify(RELATIONSHIP_TYPES)}, "description": string}]
}
"sourceLabel" and "targetLabel" must exactly match a "label" in "nodes". Every node should
participate in at least one edge — an isolated node is not useful in a system map.`;

interface RequestBody {
  subject: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body?.subject?.trim()) {
      return new Response(JSON.stringify({ error: "subject is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY is not configured on this Supabase project" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = Deno.env.get("AIOS_MODEL") || "deepseek-chat";

    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 3000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Build a system map for: ${body.subject}` },
        ],
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
    const rawText: string = data?.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) {
        return new Response(JSON.stringify({ error: "Model did not return valid JSON", raw: rawText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      parsed = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
