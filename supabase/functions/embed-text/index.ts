// Embeddings for semantic search (Phase 3/4).
//
// Anthropic's API does not serve embeddings, so this calls a separate
// provider — OpenAI's text-embedding-3-small (1536 dimensions) by default,
// overridable via EMBEDDING_MODEL. Requires an EMBEDDING_API_KEY secret;
// with none set, this returns a clear 500 rather than silently no-opping.
//
// Stateless, like ask-absolute: this function only turns text into a
// vector. The caller (browser, with its own RLS-scoped session) persists
// the result — this function never touches the database.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  text?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body?.text?.trim()) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("EMBEDDING_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "EMBEDDING_API_KEY is not configured on this Supabase project — semantic search needs a separate embeddings provider key (e.g. OpenAI), set as a Supabase Edge Function secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const model = Deno.env.get("EMBEDDING_MODEL") || "text-embedding-3-small";

    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, input: body.text.slice(0, 8000) }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `Embeddings call failed: ${resp.status} ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const embedding: number[] | undefined = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      return new Response(JSON.stringify({ error: "Embeddings provider did not return a vector" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ embedding, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
