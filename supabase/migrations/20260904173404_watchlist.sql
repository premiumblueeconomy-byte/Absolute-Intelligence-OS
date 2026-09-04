-- Watchlist (section 30): monitor markets, companies, technologies,
-- industries, regulations, opportunities, prices, countries, resources.
--
-- IMPORTANT (honesty constraint, not just a schema note): this app has no
-- live external data feed. A "check for updates" action calls the same
-- reasoning engine as everything else, which is instructed to state
-- uncertainty and never fabricate current facts — it is NOT real-time
-- monitoring, and the UI must say so, not imply a live feed.

create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,

  category text not null default 'market'
    check (category in (
      'market', 'company', 'technology', 'industry', 'regulation',
      'opportunity', 'price', 'country', 'resource'
    )),
  label text not null,
  notes text not null default '',

  last_checked_at timestamptz,
  -- { summary, significantChange, potentialImplication, recommendedAction, confidence }
  last_status jsonb,

  created_at timestamptz not null default now()
);

alter table public.watchlist_items enable row level security;

create policy "watchlist_items_select_own" on public.watchlist_items
  for select using (auth.uid() = user_id);
create policy "watchlist_items_insert_own" on public.watchlist_items
  for insert with check (auth.uid() = user_id);
create policy "watchlist_items_update_own" on public.watchlist_items
  for update using (auth.uid() = user_id);
create policy "watchlist_items_delete_own" on public.watchlist_items
  for delete using (auth.uid() = user_id);

create index watchlist_items_user_id_idx on public.watchlist_items(user_id);
