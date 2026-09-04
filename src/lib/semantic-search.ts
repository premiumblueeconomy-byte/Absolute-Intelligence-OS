import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];

export interface SemanticMatch {
  id: string;
  title: string;
  summary: string;
  project_id: string;
  similarity: number;
}

interface EmbedResponse {
  embedding?: number[];
  error?: string;
}

/** Calls the embed-text edge function. Throws with the provider's own error message if EMBEDDING_API_KEY isn't set. */
export async function embedText(text: string): Promise<number[]> {
  const { data, error } = await supabase.functions.invoke<EmbedResponse>("embed-text", { body: { text } });
  if (error) throw error;
  if (!data?.embedding) throw new Error(data?.error ?? "Embedding failed");
  return data.embedding;
}

function opportunityText(o: Pick<Opportunity, "title" | "summary" | "transformation" | "markets">): string {
  return [o.title, o.summary, o.transformation, o.markets?.join(", ")].filter(Boolean).join("\n");
}

/** Embeds one opportunity's title/summary/transformation/markets and persists the vector. */
export async function embedOpportunity(opportunityId: string): Promise<void> {
  const { data: opp, error: fetchError } = await supabase
    .from("opportunities")
    .select("title, summary, transformation, markets")
    .eq("id", opportunityId)
    .single();
  if (fetchError) throw fetchError;

  const embedding = await embedText(opportunityText(opp));
  const { error: updateError } = await supabase
    .from("opportunities")
    .update({ embedding, embedded_at: new Date().toISOString() })
    .eq("id", opportunityId);
  if (updateError) throw updateError;
}

/** Embeds every not-yet-embedded opportunity in a project. Sequential (not parallel) to stay well under embeddings-provider rate limits. */
export async function embedProjectOpportunities(projectId: string): Promise<number> {
  const { data, error } = await supabase.from("opportunities").select("id").eq("project_id", projectId).is("embedded_at", null);
  if (error) throw error;
  for (const row of data ?? []) {
    await embedOpportunity(row.id);
  }
  return data?.length ?? 0;
}

/** Free-text semantic search over opportunities the caller can see that already have an embedding. */
export async function semanticSearchOpportunities(query: string, matchCount = 10): Promise<SemanticMatch[]> {
  const embedding = await embedText(query);
  const { data, error } = await supabase.rpc("match_opportunities", { p_query_embedding: embedding, p_match_count: matchCount });
  if (error) throw error;
  return data ?? [];
}
