-- Decision Log (section 29): "Every important decision should be stored."
-- This is what turns a project into institutional memory rather than a
-- disposable analysis session.

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,

  decision text not null,
  decided_at date not null default current_date,
  decision_maker text not null default '',
  context text not null default '',
  options_considered text not null default '',
  evidence text not null default '',
  assumptions text not null default '',
  expected_outcome text not null default '',
  actual_outcome text not null default '',
  learning text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.decisions enable row level security;

create policy "decisions_select_own" on public.decisions
  for select using (auth.uid() = user_id);
create policy "decisions_insert_own" on public.decisions
  for insert with check (auth.uid() = user_id);
create policy "decisions_update_own" on public.decisions
  for update using (auth.uid() = user_id);
create policy "decisions_delete_own" on public.decisions
  for delete using (auth.uid() = user_id);

create trigger decisions_set_updated_at
  before update on public.decisions
  for each row execute function public.set_updated_at();

create index decisions_project_id_idx on public.decisions(project_id);
