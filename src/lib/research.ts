import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { persistOpportunities } from "@/lib/opportunities";

export type ResearchDocument = Database["public"]["Tables"]["research_documents"]["Row"];

export interface ResearchExtraction {
  title: string;
  authors: string[];
  researchQuestion: string;
  methodology: string;
  materials: string;
  results: string;
  findings: string[];
  limitations: string[];
  technology: string;
  trl: number;
  trlRationale: string;
  novelty: string;
  potentialApplications: string[];
  potentialProducts: string[];
  commercialOpportunities: string[];
  requiredValidation: string[];
  potentialIp: string[];
  potentialCustomers: string[];
  commercializationRoadmap: string[];
  confidence: number;
}

const TEXT_TYPES = new Set(["text/plain", "text/markdown", "text/csv"]);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadAndExtract(input: { projectId: string; file: File }): Promise<{ doc: ResearchDocument; extraction: ResearchExtraction }> {
  const { file, projectId } = input;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");

  const isPdf = file.type === "application/pdf";
  if (!isPdf && !TEXT_TYPES.has(file.type) && !/\.(txt|md|csv)$/i.test(file.name)) {
    throw new Error("Supported formats: PDF, TXT, MD, CSV");
  }

  const path = `${auth.user.id}/${projectId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from("research-documents").upload(path, file);
  if (uploadError) throw uploadError;

  const { data: doc, error: insertError } = await supabase
    .from("research_documents")
    .insert({ project_id: projectId, user_id: auth.user.id, file_name: file.name, file_path: path, mime_type: file.type, status: "running" })
    .select("*")
    .single();
  if (insertError) throw insertError;

  try {
    const content = isPdf ? await fileToBase64(file) : await file.text();
    const { data, error } = await supabase.functions.invoke<{ extraction: ResearchExtraction }>("research-extract", {
      body: { fileName: file.name, mimeType: isPdf ? "application/pdf" : "text/plain", content },
    });
    if (error) throw error;
    if (!data?.extraction) throw new Error("No extraction returned");

    await supabase.from("research_documents").update({ extraction: data.extraction as unknown as Json, status: "completed" }).eq("id", doc.id);
    return { doc: { ...doc, extraction: data.extraction as unknown as Json, status: "completed" }, extraction: data.extraction };
  } catch (err) {
    await supabase.from("research_documents").update({ status: "failed" }).eq("id", doc.id);
    throw err;
  }
}

export async function listResearchDocuments(projectId: string): Promise<ResearchDocument[]> {
  const { data, error } = await supabase.from("research_documents").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** "Create Opportunity" from a research extraction (section 20's action buttons). */
export async function createOpportunityFromResearch(projectId: string, extraction: ResearchExtraction) {
  const created = await persistOpportunities({
    projectId,
    sourceType: "research",
    opportunities: [
      {
        title: extraction.potentialProducts[0] ?? extraction.title,
        summary: extraction.commercialOpportunities.join(" ") || extraction.novelty,
        transformation: extraction.technology,
        products: extraction.potentialProducts,
        applications: extraction.potentialApplications,
        customers: extraction.potentialCustomers,
        markets: [],
        market_attractiveness: 0,
        resource_availability: 0,
        technology_readiness: Math.round((extraction.trl / 9) * 100),
        competitive_advantage: 0,
        financial_attractiveness: 0,
        execution_feasibility: 0,
        strategic_importance: 0,
        employment_potential: 0,
        trade_potential: 0,
        regenerative_impact: 0,
        recommended_next_action: extraction.requiredValidation[0] ?? extraction.commercializationRoadmap[0] ?? "",
      },
    ],
    confidenceScore: extraction.confidence,
  });
  return created[0];
}
