// Hand-written to match supabase/migrations/20260904152748_phase1_schema.sql.
// Regenerate with `supabase gen types typescript` once the project is linked,
// and keep this file's shape in sync with any future migration.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Persona =
  | "explorer" | "researcher" | "entrepreneur" | "investor" | "consultant"
  | "corporate" | "university" | "government" | "development_organization" | "community_innovator";

export type ConversationMode =
  | "understand" | "investigate" | "map" | "discover" | "compare"
  | "challenge" | "forecast" | "build" | "invest" | "learn";

export type EvidenceStatus = "verified" | "probable" | "needs_validation" | "weak_evidence" | "unknown" | "contradicted";
export type ClaimType = "fact" | "inference" | "assumption" | "hypothesis" | "prediction" | "recommendation";
export type OpportunityStatus =
  | "signal" | "discovered" | "hypothesis" | "investigating" | "validating"
  | "prototype" | "pilot" | "commercial_validation" | "scale" | "rejected";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          persona: Persona;
          country: string;
          organization: string;
          objectives: string[];
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["profiles"]["Row"], "id" | "created_at" | "updated_at">> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          location_country: string;
          location_region: string;
          industry: string;
          objective: string;
          time_horizon: string;
          status: "active" | "paused" | "archived";
          ai_confidence: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["projects"]["Row"], "id" | "created_at" | "updated_at">> & { user_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          project_id: string | null;
          user_id: string;
          mode: ConversationMode;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["conversations"]["Row"], "id" | "created_at" | "updated_at">> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Row"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          structured: Json | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at">> & { conversation_id: string; role: "user" | "assistant" };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          location: string;
          ai_result: Json | null;
          status: "queued" | "running" | "completed" | "failed";
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["resources"]["Row"], "id" | "created_at">> & { project_id: string; user_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["resources"]["Row"]>;
        Relationships: [];
      };
      problems: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          statement: string;
          location: string;
          ai_result: Json | null;
          status: "queued" | "running" | "completed" | "failed";
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["problems"]["Row"], "id" | "created_at">> & { project_id: string; user_id: string; statement: string };
        Update: Partial<Database["public"]["Tables"]["problems"]["Row"]>;
        Relationships: [];
      };
      opportunities: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          source_resource_id: string | null;
          source_problem_id: string | null;
          title: string;
          slug: string;
          summary: string;
          source_type: "resource" | "problem" | "technology" | "research" | "manual";
          geography: Json;
          transformation: string;
          products: string[];
          applications: string[];
          customers: string[];
          markets: string[];
          market_attractiveness: number;
          resource_availability: number;
          technology_readiness: number;
          competitive_advantage: number;
          financial_attractiveness: number;
          execution_feasibility: number;
          strategic_importance: number;
          employment_potential: number;
          trade_potential: number;
          regenerative_impact: number;
          opportunity_score: number;
          confidence_score: number;
          capex: Json;
          opex: Json;
          recommended_next_action: string;
          status: OpportunityStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["opportunities"]["Row"], "id" | "created_at" | "updated_at">> & { project_id: string; user_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["opportunities"]["Row"]>;
        Relationships: [];
      };
      opportunity_scores: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          weights: Json;
          computed_score: number;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["opportunity_scores"]["Row"], "id" | "created_at">> & { opportunity_id: string; user_id: string; weights: Json; computed_score: number };
        Update: Partial<Database["public"]["Tables"]["opportunity_scores"]["Row"]>;
        Relationships: [];
      };
      claims: {
        Row: {
          id: string;
          project_id: string;
          opportunity_id: string | null;
          user_id: string;
          statement: string;
          claim_type: ClaimType;
          confidence: number;
          status: EvidenceStatus;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["claims"]["Row"], "id" | "created_at">> & { project_id: string; user_id: string; statement: string };
        Update: Partial<Database["public"]["Tables"]["claims"]["Row"]>;
        Relationships: [];
      };
      evidence: {
        Row: {
          id: string;
          project_id: string;
          opportunity_id: string | null;
          claim_id: string | null;
          user_id: string;
          source: string;
          source_url: string;
          source_type: string;
          publisher: string;
          author: string;
          publication_date: string | null;
          excerpt: string;
          confidence: number;
          status: EvidenceStatus;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["evidence"]["Row"], "id" | "created_at">> & { project_id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["evidence"]["Row"]>;
        Relationships: [];
      };
      assumptions: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          statement: string;
          validation_method: string;
          status: "unvalidated" | "validated" | "invalidated";
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["assumptions"]["Row"], "id" | "created_at">> & { opportunity_id: string; user_id: string; statement: string };
        Update: Partial<Database["public"]["Tables"]["assumptions"]["Row"]>;
        Relationships: [];
      };
      unknowns: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          question: string;
          why_it_matters: string;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["unknowns"]["Row"], "id" | "created_at">> & { opportunity_id: string; user_id: string; question: string };
        Update: Partial<Database["public"]["Tables"]["unknowns"]["Row"]>;
        Relationships: [];
      };
      prompt_templates: {
        Row: {
          id: string;
          prompt_number: number;
          category: string;
          template: string;
          workflow: string[];
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["prompt_templates"]["Row"], "id" | "created_at">> & { prompt_number: number; category: string; template: string };
        Update: Partial<Database["public"]["Tables"]["prompt_templates"]["Row"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          project_id: string;
          opportunity_id: string | null;
          user_id: string;
          title: string;
          format: "web" | "pdf";
          content: Json;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["reports"]["Row"], "id" | "created_at">> & { project_id: string; user_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
        Relationships: [];
      };
      red_team_runs: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          perspectives: string[];
          result: Json;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["red_team_runs"]["Row"], "id" | "created_at">> & { opportunity_id: string; user_id: string; result: Json };
        Update: Partial<Database["public"]["Tables"]["red_team_runs"]["Row"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          title: string;
          description: string;
          phase: "validation" | "prototype" | "pilot" | "commercial_validation" | "scale";
          owner: string;
          status: "todo" | "in_progress" | "done" | "blocked";
          priority: "low" | "medium" | "high";
          budget: number | null;
          deadline: string | null;
          dependency: string;
          kpi: string;
          evidence_required: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["tasks"]["Row"], "id" | "created_at" | "updated_at">> & { opportunity_id: string; user_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [];
      };
      scenarios: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          name: string;
          scenario_type: "baseline" | "optimistic" | "adverse" | "black_swan" | "transformative";
          variables: Json;
          results: Json;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["scenarios"]["Row"], "id" | "created_at">> & { opportunity_id: string; user_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["scenarios"]["Row"]>;
        Relationships: [];
      };
      system_maps: {
        Row: {
          id: string;
          project_id: string;
          opportunity_id: string | null;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["system_maps"]["Row"], "id" | "created_at" | "updated_at">> & { project_id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["system_maps"]["Row"]>;
        Relationships: [];
      };
      system_nodes: {
        Row: {
          id: string;
          map_id: string;
          user_id: string;
          node_type:
            | "actor" | "resource" | "problem" | "technology" | "product" | "market"
            | "institution" | "company" | "community" | "policy" | "infrastructure"
            | "waste" | "knowledge" | "capital" | "constraint";
          label: string;
          x: number;
          y: number;
          data: Json;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["system_nodes"]["Row"], "id" | "created_at">> & { map_id: string; user_id: string; label: string };
        Update: Partial<Database["public"]["Tables"]["system_nodes"]["Row"]>;
        Relationships: [];
      };
      system_edges: {
        Row: {
          id: string;
          map_id: string;
          user_id: string;
          source_node_id: string;
          target_node_id: string;
          relationship_type:
            | "causes" | "enables" | "depends_on" | "produces" | "consumes" | "transforms"
            | "finances" | "regulates" | "supplies" | "buys" | "competes_with"
            | "substitutes" | "inhibits" | "amplifies" | "reduces";
          strength: number;
          polarity: -1 | 0 | 1;
          confidence: number;
          description: string;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["system_edges"]["Row"], "id" | "created_at">> & { map_id: string; user_id: string; source_node_id: string; target_node_id: string };
        Update: Partial<Database["public"]["Tables"]["system_edges"]["Row"]>;
        Relationships: [];
      };
      experiments: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          title: string;
          hypothesis: string;
          dangerous_assumption: string;
          objective: string;
          method: string;
          required_resources: string;
          budget: number | null;
          owner: string;
          start_date: string | null;
          end_date: string | null;
          success_metric: string;
          threshold: string;
          actual_result: string;
          conclusion: string;
          learning: string;
          next_action: string;
          status: "draft" | "planned" | "running" | "completed" | "failed" | "validated" | "invalidated";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["experiments"]["Row"], "id" | "created_at" | "updated_at">> & { opportunity_id: string; user_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["experiments"]["Row"]>;
        Relationships: [];
      };
      research_documents: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          file_name: string;
          file_path: string;
          mime_type: string;
          status: "queued" | "running" | "completed" | "failed";
          extraction: Json | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["research_documents"]["Row"], "id" | "created_at">> & { project_id: string; user_id: string; file_name: string; file_path: string };
        Update: Partial<Database["public"]["Tables"]["research_documents"]["Row"]>;
        Relationships: [];
      };
      aiq_assessments: {
        Row: {
          id: string;
          user_id: string;
          answers: Json;
          domain_scores: Json;
          overall_score: number;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["aiq_assessments"]["Row"], "id" | "created_at">> & { user_id: string; answers: Json; domain_scores: Json; overall_score: number };
        Update: Partial<Database["public"]["Tables"]["aiq_assessments"]["Row"]>;
        Relationships: [];
      };
      decisions: {
        Row: {
          id: string;
          project_id: string;
          opportunity_id: string | null;
          user_id: string;
          decision: string;
          decided_at: string;
          decision_maker: string;
          context: string;
          options_considered: string;
          evidence: string;
          assumptions: string;
          expected_outcome: string;
          actual_outcome: string;
          learning: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["decisions"]["Row"], "id" | "created_at" | "updated_at">> & { project_id: string; user_id: string; decision: string };
        Update: Partial<Database["public"]["Tables"]["decisions"]["Row"]>;
        Relationships: [];
      };
      watchlist_items: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          category:
            | "market" | "company" | "technology" | "industry" | "regulation"
            | "opportunity" | "price" | "country" | "resource";
          label: string;
          notes: string;
          last_checked_at: string | null;
          last_status: Json | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["watchlist_items"]["Row"], "id" | "created_at">> & { user_id: string; label: string };
        Update: Partial<Database["public"]["Tables"]["watchlist_items"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
