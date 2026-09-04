import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Experiment = Database["public"]["Tables"]["experiments"]["Row"];
export type ExperimentStatus = Experiment["status"];

export const EXPERIMENT_STATUS_ORDER: ExperimentStatus[] = [
  "draft", "planned", "running", "completed", "validated", "invalidated", "failed",
];

export const EXPERIMENT_STATUS_LABEL: Record<ExperimentStatus, string> = {
  draft: "Draft", planned: "Planned", running: "Running", completed: "Completed",
  failed: "Failed", validated: "Validated", invalidated: "Invalidated",
};

export async function listExperiments(opportunityId: string): Promise<Experiment[]> {
  const { data, error } = await supabase.from("experiments").select("*").eq("opportunity_id", opportunityId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createExperiment(input: {
  opportunityId: string;
  title: string;
  hypothesis?: string;
  dangerousAssumption?: string;
  method?: string;
  successMetric?: string;
}): Promise<Experiment> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("experiments")
    .insert({
      opportunity_id: input.opportunityId,
      user_id: auth.user.id,
      title: input.title,
      hypothesis: input.hypothesis ?? "",
      dangerous_assumption: input.dangerousAssumption ?? "",
      method: input.method ?? "",
      success_metric: input.successMetric ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateExperiment(id: string, patch: Partial<Experiment>): Promise<void> {
  const { error } = await supabase.from("experiments").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteExperiment(id: string): Promise<void> {
  const { error } = await supabase.from("experiments").delete().eq("id", id);
  if (error) throw error;
}
