-- Applied to Absolute-intelligence-os on 2026-09-19.
-- Run after the schema migrations when provisioning another environment.
-- RLS limits which rows can be edited; column grants protect the admin flag.
begin;
revoke insert, update on public.profiles from public, anon, authenticated;
grant insert (id, full_name, persona, country, organization, objectives, onboarded)
  on public.profiles to authenticated;
grant update (full_name, persona, country, organization, objectives, onboarded)
  on public.profiles to authenticated;
commit;
