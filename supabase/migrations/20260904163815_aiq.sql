-- AIQ — Absolute Intelligence Quotient (section 23). The platform trains
-- human intelligence, not just AI usage — every assessment is kept so a
-- user can see historical progress.

create table public.aiq_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- { questionId: 1-5 }
  answers jsonb not null default '{}'::jsonb,
  -- { realityIntelligence: 0-10, evidenceIntelligence: 0-10, ... }
  domain_scores jsonb not null default '{}'::jsonb,
  overall_score numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.aiq_assessments enable row level security;

create policy "aiq_assessments_select_own" on public.aiq_assessments
  for select using (auth.uid() = user_id);
create policy "aiq_assessments_insert_own" on public.aiq_assessments
  for insert with check (auth.uid() = user_id);

create index aiq_assessments_user_id_idx on public.aiq_assessments(user_id);
