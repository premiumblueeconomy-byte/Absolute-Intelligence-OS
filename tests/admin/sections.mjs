import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite({ extensions: { vector } });
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
create table storage.buckets(id text primary key,name text,public boolean);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email',current_setting('request.jwt.claim.email',true)) $$;
grant usage on schema auth,public to authenticated,anon,service_role;
grant execute on all functions in schema auth to authenticated,anon,service_role;
alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
alter default privileges in schema public grant all on sequences to authenticated,anon,service_role;`);
const dir = new URL("../../supabase/migrations/", import.meta.url);
for (const file of fs.readdirSync(dir).sort()) {
  let sql = fs
    .readFileSync(new URL(file, dir), "utf8")
    .replace('create extension if not exists "pgcrypto";', "");
  try {
    await db.exec(sql);
    console.log("Applied", file);
  } catch (e) {
    console.error("MIGRATION FAILED", file, e.message);
    process.exit(1);
  }
}


const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
await db.exec(`insert into auth.users(id,email) values('${owner}','owner@test.invalid'),('${other}','other@test.invalid');`);
async function asUser(id){await db.exec(`reset role;set request.jwt.claim.sub='${id}';set role authenticated;`);}
async function denied(sql,values,pattern){await assert.rejects(()=>db.query(sql,values),pattern);}
await asUser(owner);
const project=(await db.query('insert into projects(user_id,title) values($1,$2) returning id',[owner,'Section tests'])).rows[0].id;
const opportunity=(await db.query('insert into opportunities(user_id,project_id,title) values($1,$2,$3) returning id',[owner,project,'Pilot'])).rows[0].id;
const batch='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function begin(section,b=batch){return (await db.query('select begin_opportunity_section($1,$2,$3,$4) value',[opportunity,section,b,'Use actual evidence.'])).rows[0].value;}
async function finish(id,result,calculations={}){await db.exec('reset role;set role service_role');const r=(await db.query('select finish_opportunity_section($1,$2,$3) value',[id,JSON.stringify(result),JSON.stringify(calculations)])).rows[0].value;await asUser(owner);return r;}
async function review(id,action='apply'){return(await db.query('select review_opportunity_section($1,$2) value',[id,action])).rows[0].value;}
await asUser(other);await denied('select begin_opportunity_section($1,$2,$3)',[opportunity,'overview',batch],/owner/);await asUser(owner);
const first=await begin('overview');assert.equal(first.claimed,true);assert.equal((await begin('overview')).claimed,false);
await denied('select finish_opportunity_section($1,$2)',[first.run.id,'{}'],/permission denied/);
const base={summary:'Proposed pilot',caveats:['Unverified']};
const overview={...base,transformation:'New process',commercialPotential:'Potential',products:['Output'],applications:['Use'],customers:['Buyer'],markets:['Market'],nextSteps:['Validate']};
await finish(first.run.id,overview);assert.equal((await begin('overview')).run.id,first.run.id);
assert.equal((await db.query('select summary from opportunities where id=$1',[opportunity])).rows[0].summary,'');
await review(first.run.id);await review(first.run.id);assert.equal((await db.query('select summary from opportunities where id=$1',[opportunity])).rows[0].summary,'Proposed pilot');
await denied('update opportunity_section_runs set result=$1 where id=$2',['{}',first.run.id],/permission denied/);
// New drafts must detect intervening edits.
const newer=await begin('overview','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');await finish(newer.run.id,overview);
await db.query('update opportunities set summary=$1 where id=$2',['Manual edit',opportunity]);await denied('select review_opportunity_section($1,$2)',[newer.run.id,'apply'],/changed since/);await review(newer.run.id,'discard');
// Preserve actual results and progress on same-title proposals and repeated application.
await db.query('insert into experiments(opportunity_id,user_id,title,actual_result,status) values($1,$2,$3,$4,$5)',[opportunity,owner,'Existing experiment','Measured actual result','completed']);
const exp=await begin('experiments');await finish(exp.run.id,{...base,experiments:[{title:'Existing experiment',hypothesis:'Do not replace',method:'Method',successCriteria:'Metric',resources:'Lab'},{title:'New experiment',hypothesis:'Hypothesis',method:'Method',successCriteria:'Metric',resources:'Lab'}]});await review(exp.run.id);await review(exp.run.id);
let rows=(await db.query('select * from experiments where opportunity_id=$1 order by title',[opportunity])).rows;assert.equal(rows.length,2);assert.equal(rows[0].actual_result,'Measured actual result');assert.equal(rows[0].status,'completed');assert.equal(rows[1].actual_result,'');
await db.query('insert into tasks(opportunity_id,user_id,title,status) values($1,$2,$3,$4)',[opportunity,owner,'Existing task','done']);
const exe=await begin('execution');await finish(exe.run.id,{...base,tasks:[{title:'Existing task',description:'New proposal',phase:'validation',milestone:'Gate',dependency:'None',suggestedOwner:'Lead',kpi:'Metric'},{title:'New task',description:'New proposal',phase:'prototype',milestone:'Gate',dependency:'Existing task',suggestedOwner:'Lead',kpi:'Metric'}]});await review(exe.run.id);await review(exe.run.id);assert.equal((await db.query('select status from tasks where title=$1',['Existing task'])).rows[0].status,'done');assert.equal((await db.query('select count(*)::int n from tasks where opportunity_id=$1',[opportunity])).rows[0].n,2);
const ev=await begin('evidence');await finish(ev.run.id,{...base,assumptions:[{statement:'Assumption',validationMethod:'Test',evidenceNeeded:'Data'}],unknowns:[{question:'Question?',whyItMatters:'Risk',evidenceNeeded:'Study'}]});await review(ev.run.id);await review(ev.run.id);assert.equal((await db.query('select count(*)::int n from assumptions where opportunity_id=$1',[opportunity])).rows[0].n,1);
const red=await begin('redteam');await finish(red.run.id,{...base,objections:[]});await review(red.run.id,'discard');await review(red.run.id,'discard');
// Stale worker is refunded; retry has a new version; late completion cannot win.
const stale=await begin('scenarios');await db.exec('reset role');await db.query("update opportunity_section_runs set created_at=now()-interval '4 minutes' where id=$1",[stale.run.id]);await asUser(owner);const retry=await begin('scenarios');assert.notEqual(retry.run.id,stale.run.id);assert.equal((await finish(stale.run.id,base)).status,'failed');
await db.exec('reset role');await db.query('select finish_opportunity_section($1,null,$2,$3)',[retry.run.id,'{}','Provider unavailable']);await asUser(owner);
// Apply calculated scores and all five scenario records, exactly once.
const scoring=await begin('scoring');const keys=['marketAttractiveness','resourceAvailability','technologyReadiness','competitiveAdvantage','financialAttractiveness','executionFeasibility','strategicImportance','employmentPotential','tradePotential','regenerativeImpact'];
await finish(scoring.run.id,{...base,dimensions:keys.map(key=>({key,score:60,explanation:'Unverified',evidenceGaps:['Data']}))},{overallScore:60,confidence:0,weights:Object.fromEntries(keys.map(k=>[k,10]))});await review(scoring.run.id);await review(scoring.run.id);assert.equal((await db.query('select opportunity_score from opportunities where id=$1',[opportunity])).rows[0].opportunity_score,'60');
const scenario=await begin('scenarios');const types=['baseline','optimistic','adverse','black_swan','transformative'];await finish(scenario.run.id,{...base,scenarios:types.map(type=>({name:type,type,variables:[]}))},{scenarios:Object.fromEntries(types.map(t=>[t,{projectedMargin:30}]))});await review(scenario.run.id);await review(scenario.run.id);assert.equal((await db.query('select count(*)::int n from scenarios where opportunity_id=$1',[opportunity])).rows[0].n,5);
// Controls and quotas enforced before a new reservation.
await db.exec('reset role;update platform_controls set generation_enabled=false');await asUser(owner);await denied('select begin_opportunity_section($1,$2,$3)',[opportunity,'scoring','cccccccc-cccc-4ccc-8ccc-cccccccccccc'],/paused/);
await db.exec("reset role;update platform_controls set generation_enabled=true;update billing_plans set monthly_runs=0 where id='free'");await asUser(owner);await denied('select begin_opportunity_section($1,$2,$3)',[opportunity,'scoring','cccccccc-cccc-4ccc-8ccc-cccccccccccc'],/limit/);
await db.exec(`reset role;update profiles set account_status='suspended' where id='${owner}'`);await asUser(owner);await denied('select begin_opportunity_section($1,$2,$3)',[opportunity,'scoring','cccccccc-cccc-4ccc-8ccc-cccccccccccc'],/not active/);await denied('select review_opportunity_section($1,$2)',[exp.run.id,'apply'],/not active/);assert.equal((await db.query('select count(*)::int n from opportunity_section_runs')).rows[0].n,0);
await asUser(other);assert.equal((await db.query('select count(*)::int n from opportunity_section_runs')).rows[0].n,0);
console.log('Section lifecycle, permissions, idempotency, retries, preservation, controls and quotas passed.');await db.close();


