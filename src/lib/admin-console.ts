import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  account_status: "active" | "suspended";
  suspension_reason: string;
  is_platform_admin: boolean;
  plan: string;
  subscription_status: string;
  project_count: number;
  month_runs: number;
  last_sign_in_at: string | null;
}
export interface BillingPlan {
  id: "free" | "pro" | "enterprise";
  name: string;
  description: string;
  price_minor: number | null;
  currency: string;
  billing_interval: "month" | "year";
  stripe_price_id: string | null;
  enabled: boolean;
  max_projects: number | null;
  monthly_runs: number | null;
}
export interface Controls {
  generation_enabled: boolean;
  announcement: string;
  support_email: string;
}
export interface AdminPrompt {
  id: string;
  prompt_number: number;
  category: string;
  template: string;
  is_active: boolean;
}
export interface AuditEntry {
  id: number;
  actor_name: string;
  action: string;
  target: string;
  details: Json;
  created_at: string;
}
export interface Page<T> {
  items: T[];
  total: number;
}
export async function adminCall<T>(
  action: string,
  payload: unknown = {},
): Promise<T> {
  const { data, error } = await supabase.rpc("admin_console", {
    p_action: action,
    p_payload: payload as Json,
  });
  if (error) throw new Error(error.message);
  return data as T;
}
