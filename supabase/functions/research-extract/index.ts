// Research-to-Enterprise Engine (spec section 20) — extraction call.
//
// Accepts either a base64-encoded PDF (native Anthropic PDF document
// support — no separate PDF-parsing library needed) or plain text
// (.txt/.md/.csv), and returns a structured commercialization assessment,
// not a summary paragraph.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Research-to-Enterprise engine of Absolute Intelligence OS.

Given a research document, extract a structured commercialization assessment. Follow the same
epistemic discipline as the rest of the platform: never invent findings the document does not
support, never invent statistics or sources, distinguish what the document actually claims from
what you are inferring, and flag when TRL or commercial readiness is genuinely unclear from the
text provided.

Respond with a single JSON object matching exactly this shape (no prose outside the JSON, no
markdown fences):
{
  "title": string,
  "authors": string[],
  "researchQuestion": string,
  "methodology": string,
  "materials": string,
  "results": string,
  "findings": string[],
  "limitations": string[],
  "technology": string,
  "trl": number,
  "trlRationale": string,
  "novelty": string,
  "potentialApplications": string[],
  "potentialProducts": string[],
  "commercialOpportunities": string[],
  "requiredValidation": string[],
  "potentialIp": string[],
  "potentialCustomers": string[],
  "commercializationRoadmap": string[],
  "confidence": number
}
"trl" is 1-9 (technology readiness level) — only assign a specific number if the document supports
it; otherwise make your best defensible estimate and explain the basis in "trlRationale".
"confidence" (0-100) reflects how much of this assessment is grounded in the document itself versus
your own inference — a document with thin methodology detail should score confidence low even if
the commercial story looks exciting.`;

interface RequestBody {
  fileName: string;
  mimeType: string;
  /** Either base64 PDF bytes (mimeType === "application/pdf") or plain text otherwise. */
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body?.content) {
      return new Response(JSON.stringify({ error: "content is required" }), {
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
    const isPdf = body.mimeType === "application/pdf";

    const userContent = isPdf
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: body.content } },
          { type: "text", text: `Extract the structured commercialization assessment from "${body.fileName}".` },
        ]
      : [
          { type: "text", text: `Document "${body.fileName}":\n\n${body.content}\n\nExtract the structured commercialization assessment.` },
        ];

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
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
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) {
        return new Response(JSON.stringify({ error: "Model did not return valid JSON", raw: rawText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      parsed = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify({ extraction: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
