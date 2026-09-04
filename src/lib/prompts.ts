import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PromptTemplate = Database["public"]["Tables"]["prompt_templates"]["Row"];

export async function listPromptTemplates(): Promise<PromptTemplate[]> {
  const { data, error } = await supabase.from("prompt_templates").select("*").order("prompt_number");
  if (error) throw error;
  return data ?? [];
}

export function groupByCategory(prompts: PromptTemplate[]): Record<string, PromptTemplate[]> {
  const out: Record<string, PromptTemplate[]> = {};
  for (const p of prompts) {
    (out[p.category] ??= []).push(p);
  }
  return out;
}

/** Fill [PLACEHOLDER] tokens in a template with user-supplied values. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    out = out.replaceAll(`[${key.toUpperCase()}]`, value);
  }
  return out;
}

export function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\[([A-Z /]+)\]/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}
