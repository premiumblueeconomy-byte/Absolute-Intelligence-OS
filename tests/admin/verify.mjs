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
const admin = "11111111-1111-4111-8111-111111111111",
  user = "22222222-2222-4222-8222-222222222222";
await db.exec(
  `insert into auth.users(id,email) values('${admin}','admin@example.test'),('${user}','user@example.test');update profiles set is_platform_admin=true where id='${admin}';`,
);
async function asUser(id) {
  await db.exec(
    `reset role;set request.jwt.claim.sub='${id}';set role authenticated;`,
  );
}
async function denied(sql, match) {
  try {
    await db.exec(sql);
    assert.fail("Expected denied: " + sql);
  } catch (e) {
    assert.match(e.message, match);
  }
}
await asUser(user);
await denied(`select admin_console('users')`, /Administrator access/);
await denied(
  `update profiles set is_platform_admin=true where id='${user}'`,
  /permission denied/,
);
await denied(
  `update profiles set account_status='active' where id='${user}'`,
  /permission denied/,
);
await denied(
  `select finish_generation(gen_random_uuid(),true)`,
  /permission denied/,
);
await asUser(admin);
for (const action of [
  "overview",
  "users",
  "configuration",
  "prompts",
  "audit",
]) {
  const r = await db.query(`select admin_console($1) result`, [action]);
  assert.ok(r.rows[0].result);
}
await denied(
  `select admin_console('update_user','{"id":"${admin}","account_status":"suspended","is_platform_admin":true,"reason":"test suspension"}')`,
  /own access/,
);
await db.query(`select admin_console('save_plan',$1::jsonb)`, [
  JSON.stringify({
    id: "free",
    name: "Free",
    description: "Test",
    price_minor: 0,
    currency: "usd",
    billing_interval: "month",
    stripe_price_id: null,
    enabled: true,
    max_projects: 1,
    monthly_runs: 1,
  }),
]);
await asUser(user);
await db.exec(`insert into projects(user_id,title) values('${user}','First')`);
await denied(
  `insert into projects(user_id,title) values('${user}','Second')`,
  /Project limit/,
);
const reserve = (await db.query(`select reserve_generation() id`)).rows[0].id;
await denied(`select reserve_generation()`, /Monthly generation limit/);
await db.exec("reset role");
await db.query("select finish_generation($1,false)", [reserve]);
await asUser(user);
const again = (await db.query(`select reserve_generation() id`)).rows[0].id;
await db.exec("reset role");
await db.query("select finish_generation($1,true)", [again]);
await asUser(user);
await denied(`select reserve_generation()`, /Monthly generation limit/);
await asUser(admin);
await db.query(`select admin_console('update_user',$1::jsonb)`, [
  JSON.stringify({
    id: user,
    account_status: "suspended",
    is_platform_admin: false,
    reason: "Testing account suspension",
  }),
]);
await asUser(user);
assert.equal((await db.query(`select * from projects`)).rows.length, 0);
await denied(`select reserve_generation()`, /not active/);
assert.ok((await db.query(`select billing_summary()`)).rows[0]);
await db.exec("reset role");
const evt = (id, created, status) =>
  db.query(
    `select apply_billing_event($1,'customer.subscription.updated',$2,$3,'cus_test','sub_test','pro',$4,now()+interval '1 month',false) applied`,
    [id, created, user, status],
  );
assert.equal((await evt("evt_new", 200, "active")).rows[0].applied, true);
assert.equal((await evt("evt_new", 200, "canceled")).rows[0].applied, false);
await evt("evt_old", 100, "canceled");
assert.equal(
  (await db.query(`select status from subscriptions where user_id='${user}'`))
    .rows[0].status,
  "active",
);
await evt("evt_cancel", 300, "canceled");
assert.equal(
  (await db.query(`select effective_plan_id('${user}') p`)).rows[0].p,
  "free",
);
console.log(
  "PASS: migration, admin authorization, role protection, quota enforcement/refunds, suspension, billing access, webhook deduplication and ordering",
);
await db.close();
