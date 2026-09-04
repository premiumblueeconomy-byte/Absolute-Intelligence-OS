import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
export type OrganizationInvite = Database["public"]["Tables"]["organization_invites"]["Row"];
export type OrgType = Organization["org_type"];
export type OrgRole = OrganizationMember["role"];

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  company: "Company", university: "University", government: "Government",
  investment_firm: "Investment Firm", ngo: "NGO", research_institute: "Research Institute",
  consultancy: "Consultancy", community_organization: "Community Organization",
};

export const ORG_ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Owner", admin: "Admin", strategist: "Strategist", researcher: "Researcher",
  analyst: "Analyst", member: "Member", viewer: "Viewer",
};

export async function listMyOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const { data, error } = await supabase.from("organizations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createOrganization(input: { name: string; orgType: OrgType }): Promise<Organization> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name: input.name, org_type: input.orgType, created_by: auth.user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listMembers(orgId: string): Promise<OrganizationMember[]> {
  const { data, error } = await supabase.from("organization_members").select("*").eq("org_id", orgId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function changeMemberRole(memberId: string, role: OrgRole): Promise<void> {
  const { error } = await supabase.from("organization_members").update({ role }).eq("id", memberId);
  if (error) throw error;
}

export async function inviteMember(input: { orgId: string; email: string; role: Exclude<OrgRole, "owner"> }): Promise<OrganizationInvite> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("organization_invites")
    .insert({ org_id: input.orgId, email: input.email.trim().toLowerCase(), role: input.role, invited_by: auth.user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listSentInvites(orgId: string): Promise<OrganizationInvite[]> {
  const { data, error } = await supabase.from("organization_invites").select("*").eq("org_id", orgId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** Pending invites addressed to the current user's own account email. */
export async function listMyPendingInvites(): Promise<OrganizationInvite[]> {
  const { data, error } = await supabase.from("organization_invites").select("*").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function acceptInvite(inviteId: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_organization_invite", { p_invite_id: inviteId });
  if (error) throw error;
  return data;
}

export async function declineInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from("organization_invites").delete().eq("id", inviteId);
  if (error) throw error;
}
