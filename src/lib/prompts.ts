import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PromptTemplate = Database["public"]["Tables"]["prompt_templates"]["Row"];

export async function listPromptTemplates(): Promise<PromptTemplate[]> {
  const prompts: PromptTemplate[] = [];
  let after = 0;
  // Keyset pagination also works when the server's row limit is below our batch size.
  while (true) {
    const { data, error } = await supabase.from("prompt_templates").select("*")
      .gt("prompt_number", after).order("prompt_number").limit(250);
    if (error) throw error;
    if (!data?.length) return prompts;
    prompts.push(...data);
    after = data[data.length - 1].prompt_number;
  }
}

export function filterPrompts(prompts: PromptTemplate[], query: string, category: string): PromptTemplate[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return prompts.filter((p) => {
    if (category && p.category !== category) return false;
    const text = `${p.category} ${p.template}`.toLowerCase();
    return terms.every((term) => /^#?\d+$/.test(term)
      ? p.prompt_number === Number(term.replace(/^#/, ""))
      : text.includes(term));
  });
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

