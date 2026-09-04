-- Absolute Intelligence OS — Phase 1 schema.
-- Structured intelligence objects (projects, opportunities, evidence, claims,
-- assumptions, unknowns) rather than a chat-log table. See the product spec's
-- section 34 for the full long-term entity list; this is the Phase 1 subset.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── profiles ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  persona text not null default 'explorer'
    check (persona in (
      'explorer', 'researcher', 'entrepreneur', 'investor', 'consultant',
      'corporate', 'university', 'government', 'development_organization',
      'community_innovator'
    )),
  country text not null default '',
  organization text not null default '',
  objectives text[] not null default '{}',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row on signup so onboarding always has a target row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── projects ─────────────────────────

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  location_country text not null default '',
  location_region text not null default '',
  industry text not null default '',
  objective text not null default '',
  time_horizon text not null default '',
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  ai_confidence numeric not null default 0 check (ai_confidence >= 0 and ai_confidence <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create index projects_user_id_idx on public.projects(user_id);

-- ─────────────────────── conversations ───────────────────────

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'understand'
    check (mode in (
      'understand', 'investigate', 'map', 'discover', 'compare',
      'challenge', 'forecast', 'build', 'invest', 'learn'
    )),
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "conversations_select_own" on public.conversations
  for select using (auth.uid() = user_id);
create policy "conversations_insert_own" on public.conversations
  for insert with check (auth.uid() = user_id);
create policy "conversations_update_own" on public.conversations
  for update using (auth.uid() = user_id);
create policy "conversations_delete_own" on public.conversations
  for delete using (auth.uid() = user_id);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create index conversations_project_id_idx on public.conversations(project_id);
create index conversations_user_id_idx on public.conversations(user_id);

-- ────────────────────────── messages ──────────────────────────

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  -- Structured agent-output-contract JSON (section 25 of the spec):
  -- { summary, findings, claims, evidence_needed, assumptions, unknowns,
  --   risks, opportunities, recommendations, confidence, next_actions }
  structured jsonb,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_select_own" on public.messages
  for select using (
    exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
create policy "messages_insert_own" on public.messages
  for insert with check (
    exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );

create index messages_conversation_id_idx on public.messages(conversation_id);

-- ────────────────────────── resources ──────────────────────────
-- Resource Explorer runs (section 8/9): input resource + location, AI result
-- cascade (components/properties/functions/transformation pathways).

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text not null default '',
  ai_result jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.resources enable row level security;

create policy "resources_select_own" on public.resources
  for select using (auth.uid() = user_id);
create policy "resources_insert_own" on public.resources
  for insert with check (auth.uid() = user_id);
create policy "resources_update_own" on public.resources
  for update using (auth.uid() = user_id);
create policy "resources_delete_own" on public.resources
  for delete using (auth.uid() = user_id);

create index resources_project_id_idx on public.resources(project_id);

-- ────────────────────────── problems ──────────────────────────
-- Problem Explorer runs (section 10).

create table public.problems (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  statement text not null,
  location text not null default '',
  ai_result jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.problems enable row level security;

create policy "problems_select_own" on public.problems
  for select using (auth.uid() = user_id);
create policy "problems_insert_own" on public.problems
  for insert with check (auth.uid() = user_id);
create policy "problems_update_own" on public.problems
  for update using (auth.uid() = user_id);
create policy "problems_delete_own" on public.problems
  for delete using (auth.uid() = user_id);

create index problems_project_id_idx on public.problems(project_id);

-- ──────────────────────── opportunities ────────────────────────
-- The Opportunity Genome (section 11/35): the central structured AI object.

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_resource_id uuid references public.resources(id) on delete set null,
  source_problem_id uuid references public.problems(id) on delete set null,

  title text not null,
  slug text not null default '',
  summary text not null default '',
  source_type text not null default 'manual'
    check (source_type in ('resource', 'problem', 'technology', 'research', 'manual')),

  geography jsonb not null default '{}'::jsonb,
  transformation text not null default '',
  products text[] not null default '{}',
  applications text[] not null default '{}',
  customers text[] not null default '{}',
  markets text[] not null default '{}',

  -- Scoring inputs, 0-100 each (section 12 / the scoring function).
  market_attractiveness numeric not null default 0,
  resource_availability numeric not null default 0,
  technology_readiness numeric not null default 0,
  competitive_advantage numeric not null default 0,
  financial_attractiveness numeric not null default 0,
  execution_feasibility numeric not null default 0,
  strategic_importance numeric not null default 0,
  employment_potential numeric not null default 0,
  trade_potential numeric not null default 0,
  regenerative_impact numeric not null default 0,

  opportunity_score numeric not null default 0,
  confidence_score numeric not null default 0,

  capex jsonb not null default '{}'::jsonb,
  opex jsonb not null default '{}'::jsonb,

  recommended_next_action text not null default '',

  -- Opportunity status pipeline (the doc's "Opportunity status pipeline" section).
  status text not null default 'discovered'
    check (status in (
      'signal', 'discovered', 'hypothesis', 'investigating', 'validating',
      'prototype', 'pilot', 'commercial_validation', 'scale', 'rejected'
    )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunities enable row level security;

create policy "opportunities_select_own" on public.opportunities
  for select using (auth.uid() = user_id);
create policy "opportunities_insert_own" on public.opportunities
  for insert with check (auth.uid() = user_id);
create policy "opportunities_update_own" on public.opportunities
  for update using (auth.uid() = user_id);
create policy "opportunities_delete_own" on public.opportunities
  for delete using (auth.uid() = user_id);

create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

create index opportunities_project_id_idx on public.opportunities(project_id);
create index opportunities_user_id_idx on public.opportunities(user_id);

-- ─────────────────────── opportunity_scores ───────────────────────
-- History of scoring runs when a user adjusts the dimension weights.

create table public.opportunity_scores (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weights jsonb not null,
  computed_score numeric not null,
  created_at timestamptz not null default now()
);

alter table public.opportunity_scores enable row level security;

create policy "opportunity_scores_select_own" on public.opportunity_scores
  for select using (auth.uid() = user_id);
create policy "opportunity_scores_insert_own" on public.opportunity_scores
  for insert with check (auth.uid() = user_id);

create index opportunity_scores_opportunity_id_idx on public.opportunity_scores(opportunity_id);

-- ────────────────────────── claims ──────────────────────────
-- Claims Manager (section 14): fact / inference / assumption / hypothesis /
-- prediction / recommendation, each with a confidence and status.

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  statement text not null,
  claim_type text not null default 'inference'
    check (claim_type in ('fact', 'inference', 'assumption', 'hypothesis', 'prediction', 'recommendation')),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 100),
  status text not null default 'needs_validation'
    check (status in ('verified', 'probable', 'needs_validation', 'weak_evidence', 'unknown', 'contradicted')),
  created_at timestamptz not null default now()
);

alter table public.claims enable row level security;

create policy "claims_select_own" on public.claims
  for select using (auth.uid() = user_id);
create policy "claims_insert_own" on public.claims
  for insert with check (auth.uid() = user_id);
create policy "claims_update_own" on public.claims
  for update using (auth.uid() = user_id);
create policy "claims_delete_own" on public.claims
  for delete using (auth.uid() = user_id);

create index claims_opportunity_id_idx on public.claims(opportunity_id);

-- ────────────────────────── evidence ──────────────────────────
-- Evidence Engine (section 13): every important claim's supporting source.

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  claim_id uuid references public.claims(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  source text not null default '',
  source_url text not null default '',
  source_type text not null default '',
  publisher text not null default '',
  author text not null default '',
  publication_date date,
  excerpt text not null default '',

  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 100),
  status text not null default 'needs_validation'
    check (status in ('verified', 'probable', 'needs_validation', 'weak_evidence', 'unknown', 'contradicted')),

  created_at timestamptz not null default now()
);

alter table public.evidence enable row level security;

create policy "evidence_select_own" on public.evidence
  for select using (auth.uid() = user_id);
create policy "evidence_insert_own" on public.evidence
  for insert with check (auth.uid() = user_id);
create policy "evidence_update_own" on public.evidence
  for update using (auth.uid() = user_id);
create policy "evidence_delete_own" on public.evidence
  for delete using (auth.uid() = user_id);

create index evidence_opportunity_id_idx on public.evidence(opportunity_id);
create index evidence_claim_id_idx on public.evidence(claim_id);

-- ──────────────────────── assumptions ────────────────────────

create table public.assumptions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  statement text not null,
  validation_method text not null default '',
  status text not null default 'unvalidated'
    check (status in ('unvalidated', 'validated', 'invalidated')),
  created_at timestamptz not null default now()
);

alter table public.assumptions enable row level security;

create policy "assumptions_select_own" on public.assumptions
  for select using (auth.uid() = user_id);
create policy "assumptions_insert_own" on public.assumptions
  for insert with check (auth.uid() = user_id);
create policy "assumptions_update_own" on public.assumptions
  for update using (auth.uid() = user_id);
create policy "assumptions_delete_own" on public.assumptions
  for delete using (auth.uid() = user_id);

create index assumptions_opportunity_id_idx on public.assumptions(opportunity_id);

-- ────────────────────────── unknowns ──────────────────────────

create table public.unknowns (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  why_it_matters text not null default '',
  created_at timestamptz not null default now()
);

alter table public.unknowns enable row level security;

create policy "unknowns_select_own" on public.unknowns
  for select using (auth.uid() = user_id);
create policy "unknowns_insert_own" on public.unknowns
  for insert with check (auth.uid() = user_id);
create policy "unknowns_update_own" on public.unknowns
  for update using (auth.uid() = user_id);
create policy "unknowns_delete_own" on public.unknowns
  for delete using (auth.uid() = user_id);

create index unknowns_opportunity_id_idx on public.unknowns(opportunity_id);

-- ─────────────────────── prompt_templates ───────────────────────
-- Prompt Library (section 32/35): seeded, globally readable, not user-owned.

create table public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  prompt_number int not null unique,
  category text not null,
  template text not null,
  workflow text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.prompt_templates enable row level security;

create policy "prompt_templates_select_all" on public.prompt_templates
  for select using (true);

-- ────────────────────────── reports ──────────────────────────

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  format text not null default 'web' check (format in ('web', 'pdf')),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports_select_own" on public.reports
  for select using (auth.uid() = user_id);
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = user_id);
create policy "reports_delete_own" on public.reports
  for delete using (auth.uid() = user_id);

create index reports_project_id_idx on public.reports(project_id);
