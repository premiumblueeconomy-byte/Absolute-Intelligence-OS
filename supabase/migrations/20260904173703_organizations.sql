-- Organizations & Collaboration (spec sections 28/37).
--
-- Scope of this pass: organizations, role-based membership, email-based
-- invites, and projects optionally owned by an organization. SELECT access
-- on every project-scoped table is extended so org members can see a
-- shared project and everything inside it (opportunities, evidence, tasks,
-- scenarios, etc). Writes remain owner-only for now — multi-writer
-- conflict handling is a deliberately separate, later piece of work, not
-- silently half-built here. Uploaded research-document *files* also stay
-- owner-only (the storage bucket policy keys off the uploader's own
-- folder); only the document's row (metadata + AI extraction) becomes
-- visible to org members.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type text not null default 'company'
    check (org_type in ('company', 'university', 'government', 'investment_firm', 'ngo', 'research_institute', 'consultancy', 'community_organization')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'strategist', 'researcher', 'analyst', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

alter table public.organization_members enable row level security;

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member'
    check (role in ('admin', 'strategist', 'researcher', 'analyst', 'member', 'viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

alter table public.organization_invites enable row level security;

-- The organization_id column must exist before project_is_accessible()
-- below is created (SQL-language functions are validated against real
-- columns at CREATE FUNCTION time, not just at call time).
alter table public.projects add column organization_id uuid references public.organizations(id) on delete set null;
create index projects_organization_id_idx on public.projects(organization_id);

-- ─────────────────────────── helpers ───────────────────────────

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

/** True if the caller owns the project, or the project belongs to an org the caller is a member of. */
create or replace function public.project_is_accessible(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (p.user_id = auth.uid() or (p.organization_id is not null and public.is_org_member(p.organization_id)))
  );
$$;

create or replace function public.opportunity_is_accessible(p_opportunity_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.opportunities o
    where o.id = p_opportunity_id and public.project_is_accessible(o.project_id)
  );
$$;

create or replace function public.map_is_accessible(p_map_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.system_maps m
    where m.id = p_map_id and public.project_is_accessible(m.project_id)
  );
$$;

-- Auto-add the creator as owner (bypasses RLS: security definer, not a
-- client-issued insert into organization_members).
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.organization_members (org_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

/** Accept an invite whose email matches the caller's own auth email — creates the membership and clears the invite. */
create or replace function public.accept_organization_invite(p_invite_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_org_id uuid;
  v_role text;
  v_invite_email text;
  v_caller_email text;
begin
  select org_id, role, email into v_org_id, v_role, v_invite_email
  from public.organization_invites where id = p_invite_id;

  if v_org_id is null then
    raise exception 'Invite not found';
  end if;

  v_caller_email := (auth.jwt() ->> 'email');
  if v_caller_email is null or lower(v_caller_email) <> lower(v_invite_email) then
    raise exception 'This invite is not addressed to your account';
  end if;

  insert into public.organization_members (org_id, user_id, role)
  values (v_org_id, auth.uid(), v_role)
  on conflict (org_id, user_id) do nothing;

  delete from public.organization_invites where id = p_invite_id;

  return v_org_id;
end;
$$;

-- ─────────────────────────── policies ───────────────────────────

create policy "organizations_select_member" on public.organizations
  for select using (created_by = auth.uid() or public.is_org_member(id));
create policy "organizations_insert_self" on public.organizations
  for insert with check (created_by = auth.uid());
create policy "organizations_update_admin" on public.organizations
  for update using (public.is_org_admin(id));
create policy "organizations_delete_admin" on public.organizations
  for delete using (public.is_org_admin(id));

create policy "organization_members_select_member" on public.organization_members
  for select using (public.is_org_member(org_id));
create policy "organization_members_update_admin" on public.organization_members
  for update using (public.is_org_admin(org_id));
create policy "organization_members_delete_admin_or_self" on public.organization_members
  for delete using (public.is_org_admin(org_id) or user_id = auth.uid());

create policy "organization_invites_select" on public.organization_invites
  for select using (lower(email) = lower((auth.jwt() ->> 'email')) or public.is_org_admin(org_id));
create policy "organization_invites_insert_admin" on public.organization_invites
  for insert with check (public.is_org_admin(org_id) and invited_by = auth.uid());
create policy "organization_invites_delete" on public.organization_invites
  for delete using (lower(email) = lower((auth.jwt() ->> 'email')) or public.is_org_admin(org_id));

-- ─────────────────────── projects: org ownership ───────────────────────

drop policy "projects_select_own" on public.projects;
create policy "projects_select_accessible" on public.projects
  for select using (public.project_is_accessible(id));

drop policy "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (
    auth.uid() = user_id
    and (organization_id is null or public.is_org_member(organization_id))
  );

drop policy "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using (
    auth.uid() = user_id
    and (organization_id is null or public.is_org_member(organization_id))
  );

-- ─────────────── shared SELECT policies on project-scoped tables ───────────────

drop policy "resources_select_own" on public.resources;
create policy "resources_select_accessible" on public.resources
  for select using (public.project_is_accessible(project_id));

drop policy "problems_select_own" on public.problems;
create policy "problems_select_accessible" on public.problems
  for select using (public.project_is_accessible(project_id));

drop policy "opportunities_select_own" on public.opportunities;
create policy "opportunities_select_accessible" on public.opportunities
  for select using (public.project_is_accessible(project_id));

drop policy "opportunity_scores_select_own" on public.opportunity_scores;
create policy "opportunity_scores_select_accessible" on public.opportunity_scores
  for select using (public.opportunity_is_accessible(opportunity_id));

drop policy "claims_select_own" on public.claims;
create policy "claims_select_accessible" on public.claims
  for select using (public.project_is_accessible(project_id));

drop policy "evidence_select_own" on public.evidence;
create policy "evidence_select_accessible" on public.evidence
  for select using (public.project_is_accessible(project_id));

drop policy "assumptions_select_own" on public.assumptions;
create policy "assumptions_select_accessible" on public.assumptions
  for select using (public.opportunity_is_accessible(opportunity_id));

drop policy "unknowns_select_own" on public.unknowns;
create policy "unknowns_select_accessible" on public.unknowns
  for select using (public.opportunity_is_accessible(opportunity_id));

drop policy "reports_select_own" on public.reports;
create policy "reports_select_accessible" on public.reports
  for select using (public.project_is_accessible(project_id));

drop policy "red_team_runs_select_own" on public.red_team_runs;
create policy "red_team_runs_select_accessible" on public.red_team_runs
  for select using (public.opportunity_is_accessible(opportunity_id));

drop policy "tasks_select_own" on public.tasks;
create policy "tasks_select_accessible" on public.tasks
  for select using (public.opportunity_is_accessible(opportunity_id));

drop policy "scenarios_select_own" on public.scenarios;
create policy "scenarios_select_accessible" on public.scenarios
  for select using (public.opportunity_is_accessible(opportunity_id));

drop policy "system_maps_select_own" on public.system_maps;
create policy "system_maps_select_accessible" on public.system_maps
  for select using (public.project_is_accessible(project_id));

drop policy "system_nodes_select_own" on public.system_nodes;
create policy "system_nodes_select_accessible" on public.system_nodes
  for select using (public.map_is_accessible(map_id));

drop policy "system_edges_select_own" on public.system_edges;
create policy "system_edges_select_accessible" on public.system_edges
  for select using (public.map_is_accessible(map_id));

drop policy "experiments_select_own" on public.experiments;
create policy "experiments_select_accessible" on public.experiments
  for select using (public.opportunity_is_accessible(opportunity_id));

drop policy "research_documents_select_own" on public.research_documents;
create policy "research_documents_select_accessible" on public.research_documents
  for select using (public.project_is_accessible(project_id));

drop policy "decisions_select_own" on public.decisions;
create policy "decisions_select_accessible" on public.decisions
  for select using (public.project_is_accessible(project_id));
