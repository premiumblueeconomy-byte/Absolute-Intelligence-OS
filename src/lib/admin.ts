import { supabase } from "@/integrations/supabase/client";

export interface PlatformStats {
  total_users: number;
  total_organizations: number;
  total_projects: number;
  total_opportunities: number;
  total_resources: number;
  total_problems: number;
}

export interface AdminOrganization {
  id: string;
  name: string;
  org_type: string;
  created_at: string;
  member_count: number;
}

export interface AdminProject {
  id: string;
  title: string;
  location_country: string;
  industry: string;
  status: string;
  created_at: string;
}

/**
 * Every function here is gated server-side (admin_*() RPCs check
 * is_platform_admin() internally and return zero rows for anyone else) —
 * this client-side check is only for deciding what to render, not security.
 */
export async function amIPlatformAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) throw error;
  return data ?? false;
}

export async function getPlatformStats(): Promise<PlatformStats | null> {
  const { data, error } = await supabase.rpc("admin_platform_stats");
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function listOrganizationsAdmin(): Promise<AdminOrganization[]> {
  const { data, error } = await supabase.rpc("admin_list_organizations");
  if (error) throw error;
  return data ?? [];
}

export async function listRecentProjectsAdmin(limit = 20): Promise<AdminProject[]> {
  const { data, error } = await supabase.rpc("admin_recent_projects", { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}
