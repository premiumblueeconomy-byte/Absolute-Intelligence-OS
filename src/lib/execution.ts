import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskPhase = Task["phase"];
export type TaskStatus = Task["status"];

export const PHASE_LABEL: Record<TaskPhase, string> = {
  validation: "0–30 days · Validation",
  prototype: "31–90 days · Prototype",
  pilot: "Month 4–6 · Pilot",
  commercial_validation: "Month 7–12 · Commercial validation",
  scale: "Year 2 · Scale",
};

export const PHASE_ORDER: TaskPhase[] = ["validation", "prototype", "pilot", "commercial_validation", "scale"];
export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

export async function listTasks(opportunityId: string): Promise<Task[]> {
  const { data, error } = await supabase.from("tasks").select("*").eq("opportunity_id", opportunityId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createTask(input: {
  opportunityId: string;
  title: string;
  description?: string;
  phase: TaskPhase;
  owner?: string;
  priority?: Task["priority"];
  budget?: number;
  deadline?: string;
  dependency?: string;
  kpi?: string;
}): Promise<Task> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      opportunity_id: input.opportunityId,
      user_id: auth.user.id,
      title: input.title,
      description: input.description ?? "",
      phase: input.phase,
      owner: input.owner ?? "",
      priority: input.priority ?? "medium",
      budget: input.budget,
      deadline: input.deadline,
      dependency: input.dependency ?? "",
      kpi: input.kpi ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

/** Seed the default phased roadmap (spec section 22) from an opportunity's recommended next action. */
export async function seedDefaultRoadmap(opportunityId: string, recommendedNextAction: string): Promise<Task[]> {
  const defaults: { title: string; phase: TaskPhase }[] = [
    { title: recommendedNextAction || "Validate the dangerous assumption", phase: "validation" },
    { title: "Build a working prototype", phase: "prototype" },
    { title: "Run a pilot with real customers", phase: "pilot" },
    { title: "Prove commercial viability at small scale", phase: "commercial_validation" },
    { title: "Scale production and distribution", phase: "scale" },
  ];
  const created: Task[] = [];
  for (const d of defaults) {
    created.push(await createTask({ opportunityId, title: d.title, phase: d.phase }));
  }
  return created;
}
