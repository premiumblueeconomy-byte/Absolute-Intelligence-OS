-- Operator controls. Paid access and platform administration are independent.
alter table public.profiles add column account_status text not null default 'active' check(account_status in ('active','suspended'));
alter table public.profiles add column suspension_reason text not null default '';
revoke insert,update,delete on public.profiles from anon,authenticated;
grant update(full_name,persona,country,organization,objectives,onboarded) on public.profiles to authenticated;
alter table public.prompt_templates add column is_active boolean not null default true;

create table public.billing_plans (
 id text primary key check(id in ('free','pro','enterprise')),
 name text not null, description text not null default '',
 price_minor integer check(price_minor >= 0), currency text not null default 'usd' check(currency ~ '^[a-z]{3}$'),
 billing_interval text not null default 'month' check(billing_interval in ('month','year')),
 stripe_price_id text unique, enabled boolean not null default false,
 max_projects integer check(max_projects >= 0), monthly_runs integer check(monthly_runs >= 0),
 updated_at timestamptz not null default now()
);
insert into public.billing_plans(id,name,description,price_minor,enabled) values
 ('free','Free','Explore opportunity intelligence.',0,true),
 ('pro','Pro','For founders and active builders.',null,false),
 ('enterprise','Enterprise','For teams and institutions.',null,false);
alter table public.billing_plans enable row level security;
create policy billing_plans_read on public.billing_plans for select to authenticated using(true);
grant select on public.billing_plans to authenticated;
revoke insert,update,delete on public.billing_plans from anon,authenticated;
create table public.billing_price_history(price_id text primary key,plan_id text not null references public.billing_plans(id));
alter table public.billing_price_history enable row level security;
revoke all on public.billing_price_history from anon,authenticated;

create table public.platform_controls (
 id boolean primary key default true check(id), generation_enabled boolean not null default true,
 announcement text not null default '', support_email text not null default '',
 updated_at timestamptz not null default now()
);
insert into public.platform_controls(id) values(true);
alter table public.platform_controls enable row level security;
create policy platform_controls_read on public.platform_controls for select to authenticated using(true);
grant select on public.platform_controls to authenticated;
revoke insert,update,delete on public.platform_controls from anon,authenticated;

create table public.admin_audit_log (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
 action text not null, target text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon,authenticated;
create index admin_audit_created_idx on public.admin_audit_log(created_at desc);

create table public.generation_usage (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'reserved' check(status in ('reserved','completed','failed')),
 created_at timestamptz not null default now(), finished_at timestamptz
);
alter table public.generation_usage enable row level security;
create policy generation_usage_own on public.generation_usage for select to authenticated using(user_id=auth.uid());
grant select on public.generation_usage to authenticated;
revoke insert,update,delete on public.generation_usage from anon,authenticated;
create index generation_usage_user_month_idx on public.generation_usage(user_id,created_at);

create or replace function public.account_is_active() returns boolean language sql stable security definer set search_path=public
as $$ select coalesce((select account_status='active' from public.profiles where id=auth.uid()),false); $$;
revoke all on function public.account_is_active() from public,anon;
grant execute on function public.account_is_active() to authenticated;
create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path=public
as $$ select coalesce((select is_platform_admin and account_status='active' from public.profiles where id=auth.uid()),false); $$;
revoke all on function public.is_platform_admin() from public,anon;
grant execute on function public.is_platform_admin() to authenticated;
create policy published_prompts_required on public.prompt_templates as restrictive for select to authenticated using(is_active or (select public.is_platform_admin()));

-- Still-authenticated suspended sessions cannot bypass account regulation using the API.
-- Keep own profile and subscription readable so the user can see status and cancel billing.
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='public' and tablename not in
 ('profiles','subscriptions','billing_plans','platform_controls','admin_audit_log') loop
   if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t.tablename and c.relrowsecurity) then
     execute format('create policy active_account_required on public.%I as restrictive for all to authenticated using((select public.account_is_active())) with check((select public.account_is_active()))',t.tablename);
   end if;
 end loop;
end $$;

create or replace function public.effective_plan_id(p_user uuid) returns text language sql stable security definer set search_path=public
as $$ select coalesce((select plan from public.subscriptions where user_id=p_user and status in ('active','trialing') and (plan='free' or current_period_end>now())),'free'); $$;
revoke all on function public.effective_plan_id(uuid) from public,anon,authenticated;

create or replace function public.reserve_generation() returns uuid language plpgsql security definer set search_path=public as $$
declare v_limit integer; v_count integer; v_id uuid;
begin
 if auth.uid() is null or not public.account_is_active() then raise exception 'Your account is not active.' using errcode='42501'; end if;
 if not (select generation_enabled from public.platform_controls where id) then raise exception 'Generation is temporarily paused. Please try again later.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,17));
 select monthly_runs into v_limit from public.billing_plans where id=public.effective_plan_id(auth.uid());
 select count(*) into v_count from public.generation_usage where user_id=auth.uid() and created_at>=date_trunc('month',now()) and
 (status='completed' or (status='reserved' and created_at>now()-interval '5 minutes'));
 if not public.is_platform_admin() and v_limit is not null and v_count>=v_limit then raise exception 'Monthly generation limit reached. Review your plan on the Billing page.'; end if;
 insert into public.generation_usage(user_id) values(auth.uid()) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.reserve_generation() from public,anon;
grant execute on function public.reserve_generation() to authenticated;

-- Only the trusted generation backend may complete/refund a reservation.
create or replace function public.finish_generation(p_id uuid,p_success boolean) returns void language sql security definer set search_path=public
as $$ update public.generation_usage set status=case when p_success then 'completed' else 'failed' end,finished_at=now() where id=p_id and status='reserved'; $$;
revoke all on function public.finish_generation(uuid,boolean) from public,anon,authenticated;
grant execute on function public.finish_generation(uuid,boolean) to service_role;

create or replace function public.enforce_project_limit() returns trigger language plpgsql security definer set search_path=public as $$
declare v_limit integer;
begin
 if auth.uid() is null then return new; end if;
 if not public.account_is_active() then raise exception 'Your account is suspended.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,18));
 select max_projects into v_limit from public.billing_plans where id=public.effective_plan_id(new.user_id);
 if not public.is_platform_admin() and v_limit is not null and (select count(*) from public.projects where user_id=new.user_id)>=v_limit then
   raise exception 'Project limit reached. Review your plan on the Billing page.';
 end if;
 return new;
end $$;
revoke all on function public.enforce_project_limit() from public,anon,authenticated;
create trigger enforce_project_plan before insert on public.projects for each row execute function public.enforce_project_limit();

create or replace function public.admin_console(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_target uuid; v_before jsonb; v_after jsonb; v_q text; v_offset integer;
begin
 if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
 v_q:=left(coalesce(p_payload->>'search',''),200);
 v_offset:=greatest(0,least(coalesce((p_payload->>'offset')::integer,0),100000));
 if p_action='overview' then
   return jsonb_build_object('users',(select count(*) from public.profiles),'suspended',(select count(*) from public.profiles where account_status='suspended'),
    'projects',(select count(*) from public.projects),'opportunities',(select count(*) from public.opportunities),'organizations',(select count(*) from public.organizations),
    'paid_subscribers',(select count(*) from public.subscriptions where plan<>'free' and status in ('active','trialing') and current_period_end>now()),
    'month_runs',(select count(*) from public.generation_usage where status='completed' and created_at>=date_trunc('month',now())),
    'failed_runs',(select count(*) from public.generation_usage where status='failed' and created_at>=date_trunc('month',now())),
    'active_prompts',(select count(*) from public.prompt_templates where is_active));
 elsif p_action='users' then
   select jsonb_build_object('total',count(*)) into v_result from public.profiles p join auth.users u on u.id=p.id where p.full_name ilike '%'||v_q||'%' or u.email ilike '%'||v_q||'%';
   return v_result || jsonb_build_object('items',(select coalesce(jsonb_agg(x),'[]') from (
    select p.id,p.full_name,u.email,p.account_status,p.suspension_reason,p.is_platform_admin,p.created_at,u.last_sign_in_at,
      coalesce(s.plan,'free') plan,coalesce(s.status,'active') subscription_status,s.current_period_end,
      (select count(*) from public.projects where user_id=p.id) project_count,
      (select count(*) from public.generation_usage where user_id=p.id and status='completed' and created_at>=date_trunc('month',now())) month_runs
    from public.profiles p join auth.users u on u.id=p.id left join public.subscriptions s on s.user_id=p.id
    where p.full_name ilike '%'||v_q||'%' or u.email ilike '%'||v_q||'%' order by p.created_at desc,p.id limit 25 offset v_offset) x));
 elsif p_action='update_user' then
   v_target:=(p_payload->>'id')::uuid;
   if v_target=auth.uid() then raise exception 'Use another administrator to change your own access.'; end if;
   perform pg_advisory_xact_lock(8142701);
   select to_jsonb(p) into v_before from public.profiles p where id=v_target for update;
   if v_before is null then raise exception 'User not found.'; end if;
   if p_payload->>'account_status' not in ('active','suspended') or not (p_payload ? 'is_platform_admin') then raise exception 'Invalid account settings.'; end if;
   if p_payload->>'account_status'='suspended' and length(trim(coalesce(p_payload->>'reason','')))<5 then raise exception 'Enter a suspension reason of at least 5 characters.'; end if;
   if (v_before->>'is_platform_admin')::boolean and ((p_payload->>'is_platform_admin')::boolean=false or p_payload->>'account_status'='suspended') and
      (select count(*) from public.profiles where is_platform_admin and account_status='active')<=1 then raise exception 'The last active administrator cannot be removed.'; end if;
   update public.profiles set account_status=p_payload->>'account_status',is_platform_admin=(p_payload->>'is_platform_admin')::boolean,
    suspension_reason=case when p_payload->>'account_status'='suspended' then left(p_payload->>'reason',1000) else '' end where id=v_target;
   select jsonb_build_object('account_status',account_status,'is_platform_admin',is_platform_admin,'reason',suspension_reason) into v_after from public.profiles where id=v_target;
   insert into public.admin_audit_log(actor_id,action,target,details) values(auth.uid(),p_action,v_target::text,jsonb_build_object('before',v_before-'full_name'-'objectives'-'country'-'organization','after',v_after));
   return v_after;
 elsif p_action='configuration' then
   return jsonb_build_object('plans',(select jsonb_agg(p order by id) from public.billing_plans p),'controls',(select to_jsonb(c) from public.platform_controls c where id));
 elsif p_action='save_plan' then
   if p_payload->>'id' not in ('free','pro','enterprise') then raise exception 'Invalid plan.'; end if;
   if length(trim(coalesce(p_payload->>'name','')))=0 then raise exception 'Plan name is required.'; end if;
   if p_payload->>'id'<>'free' and (p_payload->>'enabled')::boolean and (coalesce((p_payload->>'price_minor')::integer,0)<=0 or coalesce(p_payload->>'stripe_price_id','') !~ '^price_[A-Za-z0-9]+$') then raise exception 'Set a positive price and a valid Stripe Price ID before enabling paid checkout.'; end if;
   if p_payload->>'id'='free' and (coalesce((p_payload->>'price_minor')::integer,0)<>0 or not (p_payload->>'enabled')::boolean) then raise exception 'The free plan must remain enabled with a zero price.'; end if;
   select to_jsonb(p) into v_before from public.billing_plans p where id=p_payload->>'id';
   if nullif(p_payload->>'stripe_price_id','') is not null then
     if exists(select 1 from public.billing_price_history where price_id=p_payload->>'stripe_price_id' and plan_id<>p_payload->>'id') then raise exception 'This price already belongs to another plan.'; end if;
     insert into public.billing_price_history(price_id,plan_id) values(p_payload->>'stripe_price_id',p_payload->>'id') on conflict do nothing;
   end if;
   update public.billing_plans set name=left(p_payload->>'name',80),description=left(coalesce(p_payload->>'description',''),500),
    price_minor=(p_payload->>'price_minor')::integer,currency=lower(p_payload->>'currency'),billing_interval=p_payload->>'billing_interval',
    stripe_price_id=nullif(p_payload->>'stripe_price_id',''),enabled=(p_payload->>'enabled')::boolean,
    max_projects=(p_payload->>'max_projects')::integer,monthly_runs=(p_payload->>'monthly_runs')::integer,updated_at=now() where id=p_payload->>'id';
   insert into public.admin_audit_log(actor_id,action,target,details) values(auth.uid(),p_action,p_payload->>'id',jsonb_build_object('before',v_before,'after',p_payload));
   return jsonb_build_object('saved',true);
 elsif p_action='save_controls' then
   update public.platform_controls set generation_enabled=(p_payload->>'generation_enabled')::boolean,announcement=left(coalesce(p_payload->>'announcement',''),1000),support_email=left(coalesce(p_payload->>'support_email',''),200),updated_at=now() where id;
   insert into public.admin_audit_log(actor_id,action,target,details) values(auth.uid(),p_action,'platform',p_payload);
   return jsonb_build_object('saved',true);
 elsif p_action='prompts' then
   return jsonb_build_object('total',(select count(*) from public.prompt_templates where template ilike '%'||v_q||'%' or prompt_number::text=v_q),
    'items',(select coalesce(jsonb_agg(x),'[]') from (select id,prompt_number,category,template,workflow,is_active from public.prompt_templates where template ilike '%'||v_q||'%' or prompt_number::text=v_q order by prompt_number limit 25 offset v_offset) x));
 elsif p_action='save_prompt' then
   if length(trim(coalesce(p_payload->>'template','')))<10 or length(p_payload->>'template')>20000 or length(trim(coalesce(p_payload->>'category','')))=0 then raise exception 'A category and prompt between 10 and 20,000 characters are required.'; end if;
   update public.prompt_templates set template=p_payload->>'template',category=left(p_payload->>'category',100),is_active=(p_payload->>'is_active')::boolean where id=(p_payload->>'id')::uuid;
   if not found then raise exception 'Prompt not found.'; end if;
   insert into public.admin_audit_log(actor_id,action,target,details) values(auth.uid(),p_action,p_payload->>'id',p_payload);
   return jsonb_build_object('saved',true);
 elsif p_action='audit' then
   return jsonb_build_object('items',(select coalesce(jsonb_agg(x),'[]') from (select a.*,p.full_name actor_name from public.admin_audit_log a left join public.profiles p on p.id=a.actor_id order by a.created_at desc,a.id desc limit 50 offset v_offset) x));
 else raise exception 'Unknown administrator action.';
 end if;
end $$;
revoke all on function public.admin_console(text,jsonb) from public,anon;
grant execute on function public.admin_console(text,jsonb) to authenticated;

-- Signature-verified billing events only; browser clients cannot write payment state.
create table public.billing_events (
 event_id text primary key, event_type text not null, created_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon,authenticated;
alter table public.subscriptions add column stripe_event_created bigint not null default 0;
alter table public.subscriptions add column cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column checkout_session_id text;
alter table public.subscriptions add column checkout_expires_at timestamptz;
alter table public.subscriptions add column checkout_lock_until timestamptz;
create or replace function public.acquire_checkout_lock(p_user uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
 insert into public.subscriptions(user_id) values(p_user) on conflict(user_id) do nothing;
 update public.subscriptions set checkout_lock_until=now()+interval '5 minutes' where user_id=p_user and (checkout_lock_until is null or checkout_lock_until<now());
 return found;
end $$;
revoke all on function public.acquire_checkout_lock(uuid) from public,anon,authenticated;
grant execute on function public.acquire_checkout_lock(uuid) to service_role;
create unique index subscriptions_stripe_subscription_unique on public.subscriptions(stripe_subscription_id) where stripe_subscription_id is not null;
create or replace function public.apply_billing_event(p_event_id text,p_event_type text,p_created bigint,p_user uuid,p_customer text,p_subscription text,p_plan text,p_status text,p_period_end timestamptz,p_cancel boolean) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 insert into public.billing_events(event_id,event_type) values(p_event_id,p_event_type) on conflict do nothing;
 if not found then return false; end if;
 insert into public.subscriptions(user_id,plan,status,stripe_customer_id,stripe_subscription_id,current_period_end,stripe_event_created,cancel_at_period_end)
 values(p_user,p_plan,p_status,p_customer,p_subscription,p_period_end,p_created,p_cancel)
 on conflict(user_id) do update set plan=excluded.plan,status=excluded.status,stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id,current_period_end=excluded.current_period_end,stripe_event_created=excluded.stripe_event_created,cancel_at_period_end=excluded.cancel_at_period_end
 where public.subscriptions.stripe_event_created<=excluded.stripe_event_created
 and (public.subscriptions.stripe_subscription_id is null or public.subscriptions.stripe_subscription_id=excluded.stripe_subscription_id or excluded.status in ('active','trialing'));
 return true;
end $$;
revoke all on function public.apply_billing_event(text,text,bigint,uuid,text,text,text,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.apply_billing_event(text,text,bigint,uuid,text,text,text,text,timestamptz,boolean) to service_role;
create or replace function public.billing_summary() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required.' using errcode='42501'; end if;
 return jsonb_build_object('plans',(select jsonb_agg(to_jsonb(p)-'stripe_price_id' order by case id when 'free' then 0 when 'pro' then 1 else 2 end) from public.billing_plans p),
 'controls',(select to_jsonb(c) from public.platform_controls c where id),
 'effective_plan',public.effective_plan_id(auth.uid()),
 'month_runs',(select count(*) from public.generation_usage where user_id=auth.uid() and status='completed' and created_at>=date_trunc('month',now())),
 'projects',(select count(*) from public.projects where user_id=auth.uid()));
end $$;
revoke all on function public.billing_summary() from public,anon;
grant execute on function public.billing_summary() to authenticated;

create or replace function public.match_opportunities(p_query_embedding vector,p_match_count integer default 10)
returns table(id uuid,title text,summary text,project_id uuid,similarity real)
language sql stable security definer set search_path=public as $$
 select o.id,o.title,o.summary,o.project_id,(1-(o.embedding <=> p_query_embedding))::real
 from public.opportunities o where public.account_is_active() and o.embedding is not null and public.project_is_accessible(o.project_id)
 order by o.embedding <=> p_query_embedding limit greatest(0,least(p_match_count,100));
$$;
revoke all on function public.match_opportunities(vector,integer) from public,anon;
grant execute on function public.match_opportunities(vector,integer) to authenticated;
create or replace function public.accept_organization_invite(p_invite_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_role text; v_email text;
begin
 if not public.account_is_active() then raise exception 'Your account is not active.' using errcode='42501'; end if;
 select org_id,role,email into v_org,v_role,v_email from public.organization_invites where id=p_invite_id for update;
 if v_org is null or lower(v_email) is distinct from lower(auth.jwt()->>'email') then raise exception 'Invitation not available for this account.'; end if;
 insert into public.organization_members(org_id,user_id,role) values(v_org,auth.uid(),v_role) on conflict(org_id,user_id) do nothing;
 delete from public.organization_invites where id=p_invite_id;
 return v_org;
end $$;
revoke all on function public.accept_organization_invite(uuid) from public,anon;
grant execute on function public.accept_organization_invite(uuid) to authenticated;
grant all on public.billing_plans,public.billing_price_history,public.platform_controls,public.admin_audit_log,public.generation_usage,public.billing_events to service_role;
-- Research files are protected even when an existing session remains valid.
create policy research_active_account_required on storage.objects as restrictive for all to authenticated
using(bucket_id<>'research-documents' or (select public.account_is_active()))
with check(bucket_id<>'research-documents' or (select public.account_is_active()));
