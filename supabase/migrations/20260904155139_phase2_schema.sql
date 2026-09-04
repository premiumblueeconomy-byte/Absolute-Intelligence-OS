-- Absolute Intelligence OS — Phase 2 schema: Red Team, Execution, Scenario Lab,
-- System Mapping Studio.

-- ─────────────────────── red_team_runs ───────────────────────
-- "Attack This Idea" (section 15): a persisted structured critique run
-- against an opportunity, not a one-off chat reply.

create table public.red_team_runs (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  perspectives text[] not null default '{}',
  -- Full AgentOutput JSON from the reasoning engine (vulnerabilities live in
  -- .risks, conditions-for-success in .recommendations, validation
  -- experiments in .next_actions — same contract as every other workflow).
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.red_team_runs enable row level security;

create policy "red_team_runs_select_own" on public.red_team_runs
  for select using (auth.uid() = user_id);
create policy "red_team_runs_insert_own" on public.red_team_runs
  for insert with check (auth.uid() = user_id);

create index red_team_runs_opportunity_id_idx on public.red_team_runs(opportunity_id);

-- ────────────────────────── tasks ──────────────────────────
-- Execution Engine (section 22): convert an opportunity into a phased
-- roadmap. Phases follow the spec's default 0-30 / 31-90 / 4-6mo / 7-12mo /
-- Year 2 breakdown.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  phase text not null default 'validation'
    check (phase in ('validation', 'prototype', 'pilot', 'commercial_validation', 'scale')),
  owner text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'blocked')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  budget numeric,
  deadline date,
  dependency text not null default '',
  kpi text not null default '',
  evidence_required text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create index tasks_opportunity_id_idx on public.tasks(opportunity_id);

-- ────────────────────────── scenarios ──────────────────────────
-- Scenario Lab / Counterfactual Laboratory (section 16).

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  scenario_type text not null default 'baseline'
    check (scenario_type in ('baseline', 'optimistic', 'adverse', 'black_swan', 'transformative')),
  -- [{ name, baselineValue, newValue, unit, impactRelationship }]
  variables jsonb not null default '[]'::jsonb,
  -- { revenue, costs, margin, breakEven, cashRequirement, opportunityScore, riskScore }
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.scenarios enable row level security;

create policy "scenarios_select_own" on public.scenarios
  for select using (auth.uid() = user_id);
create policy "scenarios_insert_own" on public.scenarios
  for insert with check (auth.uid() = user_id);
create policy "scenarios_update_own" on public.scenarios
  for update using (auth.uid() = user_id);
create policy "scenarios_delete_own" on public.scenarios
  for delete using (auth.uid() = user_id);

create index scenarios_opportunity_id_idx on public.scenarios(opportunity_id);

-- ──────────────────────── system_maps ────────────────────────
-- System Mapping Studio (section 17): node-and-edge visual system mapper.

create table public.system_maps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'System map',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_maps enable row level security;

create policy "system_maps_select_own" on public.system_maps
  for select using (auth.uid() = user_id);
create policy "system_maps_insert_own" on public.system_maps
  for insert with check (auth.uid() = user_id);
create policy "system_maps_update_own" on public.system_maps
  for update using (auth.uid() = user_id);
create policy "system_maps_delete_own" on public.system_maps
  for delete using (auth.uid() = user_id);

create trigger system_maps_set_updated_at
  before update on public.system_maps
  for each row execute function public.set_updated_at();

create index system_maps_project_id_idx on public.system_maps(project_id);

create table public.system_nodes (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.system_maps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  node_type text not null default 'actor'
    check (node_type in (
      'actor', 'resource', 'problem', 'technology', 'product', 'market',
      'institution', 'company', 'community', 'policy', 'infrastructure',
      'waste', 'knowledge', 'capital', 'constraint'
    )),
  label text not null,
  x numeric not null default 0,
  y numeric not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.system_nodes enable row level security;

create policy "system_nodes_select_own" on public.system_nodes
  for select using (auth.uid() = user_id);
create policy "system_nodes_insert_own" on public.system_nodes
  for insert with check (auth.uid() = user_id);
create policy "system_nodes_update_own" on public.system_nodes
  for update using (auth.uid() = user_id);
create policy "system_nodes_delete_own" on public.system_nodes
  for delete using (auth.uid() = user_id);

create index system_nodes_map_id_idx on public.system_nodes(map_id);

create table public.system_edges (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.system_maps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_node_id uuid not null references public.system_nodes(id) on delete cascade,
  target_node_id uuid not null references public.system_nodes(id) on delete cascade,
  relationship_type text not null default 'depends_on'
    check (relationship_type in (
      'causes', 'enables', 'depends_on', 'produces', 'consumes', 'transforms',
      'finances', 'regulates', 'supplies', 'buys', 'competes_with',
      'substitutes', 'inhibits', 'amplifies', 'reduces'
    )),
  strength numeric not null default 1,
  polarity smallint not null default 1 check (polarity in (-1, 0, 1)),
  confidence numeric not null default 50,
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table public.system_edges enable row level security;

create policy "system_edges_select_own" on public.system_edges
  for select using (auth.uid() = user_id);
create policy "system_edges_insert_own" on public.system_edges
  for insert with check (auth.uid() = user_id);
create policy "system_edges_update_own" on public.system_edges
  for update using (auth.uid() = user_id);
create policy "system_edges_delete_own" on public.system_edges
  for delete using (auth.uid() = user_id);

create index system_edges_map_id_idx on public.system_edges(map_id);
