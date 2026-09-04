-- Experiment Engine (section 21): "Spend small amounts to eliminate dangerous
-- assumptions before spending large amounts." A persisted object, not just
-- a bullet in a chat reply.

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  hypothesis text not null default '',
  dangerous_assumption text not null default '',
  objective text not null default '',
  method text not null default '',
  required_resources text not null default '',
  budget numeric,
  owner text not null default '',
  start_date date,
  end_date date,
  success_metric text not null default '',
  threshold text not null default '',
  actual_result text not null default '',
  conclusion text not null default '',
  learning text not null default '',
  next_action text not null default '',

  status text not null default 'draft'
    check (status in ('draft', 'planned', 'running', 'completed', 'failed', 'validated', 'invalidated')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.experiments enable row level security;

create policy "experiments_select_own" on public.experiments
  for select using (auth.uid() = user_id);
create policy "experiments_insert_own" on public.experiments
  for insert with check (auth.uid() = user_id);
create policy "experiments_update_own" on public.experiments
  for update using (auth.uid() = user_id);
create policy "experiments_delete_own" on public.experiments
  for delete using (auth.uid() = user_id);

create trigger experiments_set_updated_at
  before update on public.experiments
  for each row execute function public.set_updated_at();

create index experiments_opportunity_id_idx on public.experiments(opportunity_id);
