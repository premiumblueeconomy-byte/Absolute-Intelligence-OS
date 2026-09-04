import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { runIntelligenceWorkflow } from "@/lib/ask-absolute";

export type WatchlistItem = Database["public"]["Tables"]["watchlist_items"]["Row"];
export type WatchlistCategory = WatchlistItem["category"];

export const WATCHLIST_CATEGORY_LABEL: Record<WatchlistCategory, string> = {
  market: "Market", company: "Company", technology: "Technology", industry: "Industry",
  regulation: "Regulation", opportunity: "Opportunity", price: "Price", country: "Country", resource: "Resource",
};

export interface WatchlistStatus {
  summary: string;
  significantChange: string;
  potentialImplication: string;
  recommendedAction: string;
  confidence: number;
}

export async function listWatchlist(): Promise<WatchlistItem[]> {
  const { data, error } = await supabase.from("watchlist_items").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addWatchlistItem(input: { category: WatchlistCategory; label: string; notes?: string; projectId?: string }): Promise<WatchlistItem> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("watchlist_items")
    .insert({ user_id: auth.user.id, category: input.category, label: input.label, notes: input.notes ?? "", project_id: input.projectId ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function removeWatchlistItem(id: string): Promise<void> {
  const { error } = await supabase.from("watchlist_items").delete().eq("id", id);
  if (error) throw error;
}

/**
 * "Check for updates" — NOT a live data feed. This platform has no external
 * market/news API; it calls the same reasoning engine as everything else,
 * which is instructed to state uncertainty rather than invent current facts.
 * Always present the result as a model estimate to verify, not a live fact.
 */
export async function checkWatchlistItem(item: WatchlistItem): Promise<WatchlistItem> {
  const result = await runIntelligenceWorkflow({
    mode: "investigate",
    agents: ["reality_agent", "evidence_agent", "foresight_agent", "integrator_agent"],
    prompt: `Watchlist check for this ${WATCHLIST_CATEGORY_LABEL[item.category].toLowerCase()}: "${item.label}".${item.notes ? ` Notes: ${item.notes}` : ""}

You do not have live access to today's news or prices — do not invent a current status. Based on
what you know, put your best-effort read of the current state in "summary" (label it clearly if
based on general/older knowledge), the most significant recent development you're aware of (or
"unknown — verify with a live source") in "findings", the potential implication in
"recommendations", and the recommended action (including "verify via [specific source]" if
relevant) in "next_actions". Set "confidence" honestly low if this is based on general training
knowledge rather than current data.`,
  });

  const status: WatchlistStatus = {
    summary: result.summary,
    significantChange: result.findings[0] ?? "",
    potentialImplication: result.recommendations[0] ?? "",
    recommendedAction: result.next_actions[0] ?? "",
    confidence: result.confidence,
  };

  const { data, error } = await supabase
    .from("watchlist_items")
    .update({ last_checked_at: new Date().toISOString(), last_status: status as unknown as Json })
    .eq("id", item.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
