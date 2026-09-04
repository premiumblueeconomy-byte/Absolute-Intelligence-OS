import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProject(input: {
  title: string;
  locationCountry?: string;
  locationRegion?: string;
  industry?: string;
  objective?: string;
  timeHorizon?: string;
}): Promise<Project> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: auth.user.id,
      title: input.title,
      location_country: input.locationCountry ?? "",
      location_region: input.locationRegion ?? "",
      industry: input.industry ?? "",
      objective: input.objective ?? "",
      time_horizon: input.timeHorizon ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProjectConfidence(id: string, aiConfidence: number): Promise<void> {
  const { error } = await supabase.from("projects").update({ ai_confidence: aiConfidence }).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
