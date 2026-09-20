-- Immutable generation versions; only guarded RPCs can mutate lifecycle state.
create table public.opportunity_section_runs (
 id uuid primary key default gen_random_uuid(),
 opportunity_id uuid not null references public.opportunities(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 section text not null check(section in ('overview','scoring','evidence','redteam','experiments','scenarios','execution')),
 batch_id uuid not null, version integer not null,
 status text not null default 'generating' check(status in ('generating','completed','failed')),
 review_state text not null default 'draft' check(review_state in ('draft','applied','superseded','discarded')),
 instructions text not null default '', source_context jsonb not null,
 result jsonb, calculations jsonb not null default '{}',
 usage_id uuid not null references public.generation_usage(id),
 error text, created_at timestamptz not null default now(), finished_at timestamptz, reviewed_at timestamptz,
 unique(opportunity_id,section,version)
);
create index section_runs_batch on public.opportunity_section_runs(opportunity_id,batch_id,section,created_at desc);
create index section_runs_user on public.opportunity_section_runs(user_id);
create index section_runs_usage on public.opportunity_section_runs(usage_id);
create unique index section_runs_inflight on public.opportunity_section_runs(opportunity_id,section) where status='generating';
create unique index section_runs_current on public.opportunity_section_runs(opportunity_id,section) where review_state='applied';
alter table public.opportunity_section_runs enable row level security;
revoke all on public.opportunity_section_runs from anon,authenticated;
grant select on public.opportunity_section_runs to authenticated;
grant all on public.opportunity_section_runs to service_role;
create policy section_runs_read on public.opportunity_section_runs for select to authenticated
 using((select public.account_is_active()) and public.opportunity_is_accessible(opportunity_id));

create function public.begin_opportunity_section(p_opportunity uuid,p_section text,p_batch uuid,p_instructions text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.opportunities; r public.opportunity_section_runs; ctx jsonb; uid uuid; ver integer;
begin
 if auth.uid() is null or not public.account_is_active() then raise exception 'Your account is not active.' using errcode='42501'; end if;
 select * into o from public.opportunities where id=p_opportunity;
 if o.id is null or o.user_id<>auth.uid() or not public.project_is_accessible(o.project_id) then raise exception 'Only the opportunity owner can generate or apply sections.' using errcode='42501'; end if;
 if p_section not in ('overview','scoring','evidence','redteam','experiments','scenarios','execution') or p_section is null or p_batch is null or length(p_instructions)>4000 then raise exception 'Invalid section request.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_opportunity::text,23));
 -- A timed-out worker cannot commit after a replacement is reserved.
 for r in select * from public.opportunity_section_runs where opportunity_id=p_opportunity and status='generating' and created_at<now()-interval '3 minutes' for update loop
  update public.opportunity_section_runs set status='failed',error='Generation interrupted. Retry this section.',finished_at=now() where id=r.id;
  perform public.finish_generation(r.usage_id,false);
 end loop;
 select * into r from public.opportunity_section_runs where opportunity_id=p_opportunity and section=p_section and batch_id=p_batch and status='completed' order by version desc limit 1;
 if r.id is not null then return jsonb_build_object('claimed',false,'run',to_jsonb(r)); end if;
 select * into r from public.opportunity_section_runs where opportunity_id=p_opportunity and section=p_section and status='generating';
 if r.id is not null then return jsonb_build_object('claimed',false,'run',to_jsonb(r)); end if;
 uid:=public.reserve_generation();
 select coalesce(max(version),0)+1 into ver from public.opportunity_section_runs where opportunity_id=p_opportunity and section=p_section;
 ctx:=jsonb_build_object('opportunity',to_jsonb(o)-'embedding',
  'project',(select to_jsonb(p) from public.projects p where p.id=o.project_id),
  'weights',(select weights from public.opportunity_scores where opportunity_id=o.id order by created_at desc,id desc limit 1),
  'evidence',coalesce((select jsonb_agg(to_jsonb(e)) from public.evidence e where opportunity_id=o.id),'[]'),
  'claims',coalesce((select jsonb_agg(to_jsonb(c)) from public.claims c where opportunity_id=o.id),'[]'),
  'assumptions',coalesce((select jsonb_agg(to_jsonb(a)) from public.assumptions a where opportunity_id=o.id),'[]'),
  'unknowns',coalesce((select jsonb_agg(to_jsonb(u)) from public.unknowns u where opportunity_id=o.id),'[]'),
  'experiments',coalesce((select jsonb_agg(to_jsonb(e)) from public.experiments e where opportunity_id=o.id),'[]'),
  'scenarios',coalesce((select jsonb_agg(to_jsonb(s)) from public.scenarios s where opportunity_id=o.id),'[]'),
  'tasks',coalesce((select jsonb_agg(to_jsonb(t)) from public.tasks t where opportunity_id=o.id),'[]'),
  'redteam',coalesce((select jsonb_agg(to_jsonb(t)) from public.red_team_runs t where opportunity_id=o.id),'[]'),
  'sections',coalesce((select jsonb_agg(jsonb_build_object('section',s.section,'result',s.result,'calculations',s.calculations,'review_state',s.review_state,'id',s.id)) from public.opportunity_section_runs s where opportunity_id=o.id and status='completed' and (review_state='applied' or (batch_id=p_batch and review_state='draft'))),'[]'));
 insert into public.opportunity_section_runs(opportunity_id,user_id,section,batch_id,version,instructions,source_context,usage_id)
 values(o.id,auth.uid(),p_section,p_batch,ver,coalesce(p_instructions,''),ctx,uid) returning * into r;
 return jsonb_build_object('claimed',true,'run',to_jsonb(r));
end $$;
revoke all on function public.begin_opportunity_section(uuid,text,uuid,text) from public,anon;
grant execute on function public.begin_opportunity_section(uuid,text,uuid,text) to authenticated;

-- Service-only atomic persistence + usage completion. The worker validates the complete schema.
create function public.finish_opportunity_section(p_id uuid,p_result jsonb,p_calculations jsonb default '{}',p_error text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.opportunity_section_runs; ok boolean;
begin
 select * into r from public.opportunity_section_runs where id=p_id for update;
 if r.id is null then raise exception 'Section unavailable.'; end if;
 if r.status<>'generating' then return to_jsonb(r); end if;
 ok:=p_error is null and p_result is not null and jsonb_typeof(p_result)='object' and p_result ? 'summary';
 if not exists(select 1 from public.profiles where id=r.user_id and account_status='active') then ok:=false; p_error:='Your account is not active.'; end if;
 update public.opportunity_section_runs set status=case when ok then 'completed' else 'failed' end,
 result=case when ok then p_result end,calculations=case when ok then p_calculations else '{}' end,
 error=case when ok then null else coalesce(left(p_error,500),'Invalid section output. Retry this section.') end,finished_at=now() where id=r.id returning * into r;
 perform public.finish_generation(r.usage_id,ok);
 return to_jsonb(r);
end $$;
revoke all on function public.finish_opportunity_section(uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.finish_opportunity_section(uuid,jsonb,jsonb,text) to service_role;

create function public.review_opportunity_section(p_id uuid,p_action text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.opportunity_section_runs; o public.opportunities; x jsonb; dims jsonb; k text; dbkey text; current_weights jsonb;
begin
 if auth.uid() is null or not public.account_is_active() then raise exception 'Your account is not active.' using errcode='42501'; end if;
 select * into r from public.opportunity_section_runs where id=p_id;
 if r.id is null then raise exception 'Section unavailable.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(r.opportunity_id::text,23));
 select * into r from public.opportunity_section_runs where id=p_id for update;
 select * into o from public.opportunities where id=r.opportunity_id for update;
 if o.user_id<>auth.uid() or not public.project_is_accessible(o.project_id) then raise exception 'Only the opportunity owner can generate or apply sections.' using errcode='42501'; end if;
 if p_action not in ('apply','discard') or p_action is null then raise exception 'Invalid review action.'; end if;
 if (p_action='apply' and r.review_state in ('applied','superseded')) or (p_action='discard' and r.review_state='discarded') then return to_jsonb(r); end if;
 if r.status<>'completed' or r.review_state<>'draft' then raise exception 'Only completed drafts can be reviewed.'; end if;
 if p_action='discard' then
  update public.opportunity_section_runs set review_state='discarded',reviewed_at=now() where id=r.id returning * into r; return to_jsonb(r);
 end if;
 -- Never overwrite an intervening edit to the fields this draft replaces.
 if r.section='overview' and (to_jsonb(o)->'summary' is distinct from r.source_context#>'{opportunity,summary}' or to_jsonb(o)->'transformation' is distinct from r.source_context#>'{opportunity,transformation}' or to_jsonb(o)->'customers' is distinct from r.source_context#>'{opportunity,customers}' or to_jsonb(o)->'products' is distinct from r.source_context#>'{opportunity,products}' or to_jsonb(o)->'applications' is distinct from r.source_context#>'{opportunity,applications}' or to_jsonb(o)->'markets' is distinct from r.source_context#>'{opportunity,markets}' or to_jsonb(o)->'recommended_next_action' is distinct from r.source_context#>'{opportunity,recommended_next_action}') then raise exception 'Overview changed since generation. Generate a fresh draft to preserve your edits.'; end if;
 if r.section='scoring' and (
  exists(select value from jsonb_array_elements(r.source_context->'evidence') except select to_jsonb(e) from public.evidence e where opportunity_id=o.id)
  or exists(select to_jsonb(e) from public.evidence e where opportunity_id=o.id except select value from jsonb_array_elements(r.source_context->'evidence'))
 ) then raise exception 'Evidence changed. Generate a fresh scoring draft.'; end if;
 if r.section='overview' then
  update public.opportunities set summary=r.result->>'summary',transformation=r.result->>'transformation',products=array(select jsonb_array_elements_text(r.result->'products')),applications=array(select jsonb_array_elements_text(r.result->'applications')),customers=array(select jsonb_array_elements_text(r.result->'customers')),markets=array(select jsonb_array_elements_text(r.result->'markets')),recommended_next_action=(r.result->'nextSteps'->>0) where id=o.id;
 elsif r.section='scoring' then
  select weights into current_weights from public.opportunity_scores where opportunity_id=o.id order by created_at desc,id desc limit 1;
  if current_weights is distinct from nullif(r.source_context->'weights','null'::jsonb) then raise exception 'Scoring weights changed. Generate a fresh draft.'; end if;
  for x in select * from jsonb_array_elements(r.result->'dimensions') loop
   k:=x->>'key'; dbkey:=lower(regexp_replace(k,'([A-Z])','_\1','g'));
   if to_jsonb(o)->dbkey is distinct from r.source_context->'opportunity'->dbkey then raise exception 'Scores changed. Generate a fresh draft.'; end if;
   if dbkey not in ('market_attractiveness','resource_availability','technology_readiness','competitive_advantage','financial_attractiveness','execution_feasibility','strategic_importance','employment_potential','trade_potential','regenerative_impact') then raise exception 'Invalid dimension.'; end if;
   execute format('update public.opportunities set %I=$1 where id=$2',dbkey) using (x->>'score')::numeric,o.id;
  end loop;
  update public.opportunities set opportunity_score=(r.calculations->>'overallScore')::numeric,confidence_score=(r.calculations->>'confidence')::numeric where id=o.id;
  insert into public.opportunity_scores(opportunity_id,user_id,weights,computed_score) values(o.id,auth.uid(),r.calculations->'weights',(r.calculations->>'overallScore')::numeric);
 elsif r.section='evidence' then
  for x in select * from jsonb_array_elements(r.result->'assumptions') loop
   insert into public.assumptions(opportunity_id,user_id,statement,validation_method) select o.id,auth.uid(),x->>'statement',(x->>'validationMethod')||' Evidence needed: '||(x->>'evidenceNeeded') where not exists(select 1 from public.assumptions where opportunity_id=o.id and lower(statement)=lower(x->>'statement'));
  end loop;
  for x in select * from jsonb_array_elements(r.result->'unknowns') loop
   insert into public.unknowns(opportunity_id,user_id,question,why_it_matters) select o.id,auth.uid(),x->>'question',(x->>'whyItMatters')||' Evidence needed: '||(x->>'evidenceNeeded') where not exists(select 1 from public.unknowns where opportunity_id=o.id and lower(question)=lower(x->>'question'));
  end loop;
 elsif r.section='experiments' then
  for x in select * from jsonb_array_elements(r.result->'experiments') loop
   insert into public.experiments(opportunity_id,user_id,title,hypothesis,method,success_metric,required_resources) select o.id,auth.uid(),x->>'title',x->>'hypothesis',x->>'method',x->>'successCriteria',x->>'resources' where not exists(select 1 from public.experiments where opportunity_id=o.id and lower(title)=lower(x->>'title'));
  end loop;
 elsif r.section='execution' then
  for x in select * from jsonb_array_elements(r.result->'tasks') loop
   insert into public.tasks(opportunity_id,user_id,title,description,phase,dependency,kpi) select o.id,auth.uid(),x->>'title',(x->>'description')||' Milestone: '||(x->>'milestone')||' Suggested responsibility: '||(x->>'suggestedOwner'),x->>'phase',x->>'dependency',x->>'kpi' where not exists(select 1 from public.tasks where opportunity_id=o.id and lower(title)=lower(x->>'title'));
  end loop;
 elsif r.section='scenarios' then
  for x in select * from jsonb_array_elements(r.result->'scenarios') loop
   insert into public.scenarios(opportunity_id,user_id,name,scenario_type,variables,results) select o.id,auth.uid(),x->>'name',x->>'type',x->'variables',r.calculations->'scenarios'->(x->>'type') where not exists(select 1 from public.scenarios where opportunity_id=o.id and lower(name)=lower(x->>'name'));
  end loop;
 end if;
 -- Rich analyses remain in their original immutable version. Evidence, existing
 -- experiment outcomes, tasks and scenarios are never deleted or overwritten.
 update public.opportunity_section_runs set review_state='superseded' where opportunity_id=o.id and section=r.section and review_state='applied';
 update public.opportunity_section_runs set review_state='applied',reviewed_at=now() where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.review_opportunity_section(uuid,text) from public,anon;
grant execute on function public.review_opportunity_section(uuid,text) to authenticated;

