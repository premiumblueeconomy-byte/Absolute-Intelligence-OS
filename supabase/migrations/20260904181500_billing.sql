-- Billing/subscriptions (Phase 3/4). This migration only adds storage and a
-- default free row per new user — nothing here talks to Stripe. The
-- stripe-checkout, stripe-portal and stripe-webhook edge functions
-- (deployed separately) need STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET /
-- STRIPE_PRICE_PRO / STRIPE_PRICE_ENTERPRISE secrets, real Products/Prices
-- created in a Stripe dashboard, and the webhook registered there, before
-- checkout does anything. Until then every account just stays on 'free'.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Deliberately no insert/update/delete policy for the client: a
-- subscription row is only ever written by handle_new_user() below (on
-- signup) or by the stripe-webhook edge function, which uses the
-- service-role key and so bypasses RLS entirely — a signed-in user can
-- never edit their own plan/status directly.

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index subscriptions_stripe_customer_id_idx on public.subscriptions(stripe_customer_id);

-- Extend the existing signup trigger function to also provision a free
-- subscription row, the same pattern it already uses for profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');
  return new;
end;
$$;
