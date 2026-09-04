import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];

export type AtlasOpportunity = Opportunity & {
  project: {
    title: string;
    location_country: string;
    location_region: string;
    industry: string;
    organization_id: string | null;
  } | null;
};

/**
 * Every opportunity the caller can see — across every project they own AND
 * every project shared with them through an organization. No new RLS is
 * needed: opportunities_select_accessible (organizations migration) already
 * scopes this correctly. Fetched as two plain selects and merged client-side
 * (rather than a Supabase embedded join) because the hand-written Database
 * type has no Relationships metadata for a typed embed to resolve against.
 */
export async function listAtlasOpportunities(): Promise<AtlasOpportunity[]> {
  const [opportunitiesRes, projectsRes] = await Promise.all([
    supabase.from("opportunities").select("*").order("opportunity_score", { ascending: false }),
    supabase.from("projects").select("id, title, location_country, location_region, industry, organization_id"),
  ]);
  if (opportunitiesRes.error) throw opportunitiesRes.error;
  if (projectsRes.error) throw projectsRes.error;

  const projectById = new Map(projectsRes.data.map((p) => [p.id, p]));
  return opportunitiesRes.data.map((o) => ({ ...o, project: projectById.get(o.project_id) ?? null }));
}

export type CountryGroup = {
  country: string;
  count: number;
  avgScore: number;
  avgConfidence: number;
};

/** Client-side aggregation — no separate geo/stats table, computed from whatever the caller already has. */
export function groupByCountry(items: AtlasOpportunity[]): CountryGroup[] {
  const byCountry = new Map<string, AtlasOpportunity[]>();
  for (const o of items) {
    const country = o.project?.location_country?.trim() || "Unspecified";
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country)!.push(o);
  }
  return Array.from(byCountry.entries())
    .map(([country, rows]) => ({
      country,
      count: rows.length,
      avgScore: rows.reduce((s, r) => s + r.opportunity_score, 0) / rows.length,
      avgConfidence: rows.reduce((s, r) => s + r.confidence_score, 0) / rows.length,
    }))
    .sort((a, b) => b.count - a.count);
}
