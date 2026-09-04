-- Admin panel (Phase 3/4). A single boolean flag rather than a separate
-- roles table: there is exactly one privilege level here (platform admin or
-- not), distinct from organization roles which already exist. There is no
-- self-serve way to become a platform admin — set it directly in the
-- database (`update public.profiles set is_platform_admin = true where id = '<uuid>'`).
--
-- Every admin RPC below returns aggregates or low-sensitivity fields only
-- (never another user's email, project content, or opportunity data) and is
-- gated by is_platform_admin() inside the function body, not by RLS, so a
-- non-admin caller gets an empty result rather than an error that would
-- reveal whether the check even ran.

alter table public.profiles add column is_platform_admin boolean not null default false;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.admin_platform_stats()
returns table (
  total_users bigint,
  total_organizations bigint,
  total_projects bigint,
  total_opportunities bigint,
  total_resources bigint,
  total_problems bigint
)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.organizations),
    (select count(*) from public.projects),
    (select count(*) from public.opportunities),
    (select count(*) from public.resources),
    (select count(*) from public.problems)
  where public.is_platform_admin();
$$;

create or replace function public.admin_list_organizations()
returns table (
  id uuid, name text, org_type text, created_at timestamptz, member_count bigint
)
language sql stable security definer set search_path = public
as $$
  select o.id, o.name, o.org_type, o.created_at,
         (select count(*) from public.organization_members m where m.org_id = o.id) as member_count
  from public.organizations o
  where public.is_platform_admin()
  order by o.created_at desc;
$$;

create or replace function public.admin_recent_projects(p_limit int default 20)
returns table (
  id uuid, title text, location_country text, industry text, status text, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.title, p.location_country, p.industry, p.status, p.created_at
  from public.projects p
  where public.is_platform_admin()
  order by p.created_at desc
  limit p_limit;
$$;
