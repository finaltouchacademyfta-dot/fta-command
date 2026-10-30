-- Worker B · run supabase/schema.sql on a real PostgreSQL 16 with a Supabase-like stub,
-- twice (idempotent), then prove the guards and the Row Level Security.
\set ON_ERROR_STOP on
-- Supabase stub: roles, auth.jwt(), storage.buckets
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint);
grant usage on schema public to anon, authenticated, service_role;
drop schema public cascade; create schema public; grant usage on schema public to anon, authenticated, service_role;
\echo '--- schema.sql (1st run)'
\i /home/claude/prod/supabase/schema.sql
\echo '--- schema.sql (2nd run: must be idempotent)'
\i /home/claude/prod/supabase/schema.sql
grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role;
\set ON_ERROR_STOP off
\echo '--- data as the server (service role)'
update app_settings set value = 'owner@gmail.com' where key = 'owner_email';
insert into members (email, role, name) values ('owner@gmail.com', 'Owner', 'Owner') on conflict do nothing;
insert into members (email, role, mentor_id, name) values ('t1@gmail.com', 'Mentor', 'MEN-01', 'T1') on conflict do nothing;
insert into members (email, role, student_id) values ('s1@gmail.com', 'Student', 'STU-1001') on conflict do nothing;
insert into records (collection, id, data, mentor_ids) values ('students', 'STU-1001', '{"name":"A"}', '{MEN-01}'), ('payments', 'PAY-1', '{"amt":5}', '{}') on conflict do nothing;
insert into audit_log (email, action) values ('owner@gmail.com', 'test');
\echo 'EXPECT ERROR: Mentor without mentor_id'
insert into members (email, role) values ('t9@gmail.com', 'Mentor');
\echo 'EXPECT ERROR: upper-case email'
insert into members (email, role) values ('Bad@Gmail.com', 'Admin');
\echo 'EXPECT ERROR: unknown role'
insert into members (email, role) values ('x@gmail.com', 'God');
\echo 'EXPECT ERROR: bad collection name'
insert into records (collection, id) values ('DROP TABLE', 'x');
\echo 'EXPECT ERROR: audit_log append-only (update)'
update audit_log set action = 'changed';
\echo 'EXPECT ERROR: audit_log append-only (delete)'
delete from audit_log;
\echo 'EXPECT ERROR: the only Owner cannot be deleted'
delete from members where email = 'owner@gmail.com';
\echo 'EXPECT ERROR: the only Owner cannot be demoted'
update members set role = 'Admin' where email = 'owner@gmail.com';
\echo 'EXPECT ERROR: the only Owner cannot be switched off'
update members set active = false where email = 'owner@gmail.com';
\echo '--- a second Owner may leave; then the last one is protected again'
insert into members (email, role) values ('owner2@gmail.com', 'Owner') on conflict do nothing;
update members set role = 'Admin' where email = 'owner2@gmail.com';
select 'owner2 demoted while another Owner exists: ' || role from members where email = 'owner2@gmail.com';
select 'owners left: ' || count(*) from members where role = 'Owner';
\echo '--- anon (public key, no sign-in)'
set role anon;
\echo 'EXPECT ERROR: permission denied'
select count(*) from records;
\echo 'EXPECT ERROR: permission denied'
insert into records (collection, id) values ('payments', 'HACK');
\echo 'EXPECT ERROR: permission denied'
select * from members;
reset role;
\echo '--- authenticated teacher (signed in, but not Owner)'
set role authenticated; set request.jwt.claims = '{"email":"t1@gmail.com"}';
select 'teacher sees records: ' || count(*) from records;
select 'teacher sees members: ' || count(*) from members;
\echo 'EXPECT ERROR: permission denied (no direct writes)'
insert into records (collection, id) values ('payments', 'HACK');
\echo 'EXPECT ERROR: permission denied'
update records set data = '{}';
\echo 'EXPECT ERROR: permission denied'
delete from records;
reset role;
\echo '--- authenticated Owner: read-only view of the raw tables'
set role authenticated; set request.jwt.claims = '{"email":"owner@gmail.com"}';
select 'owner my_role(): ' || public.my_role();
select 'owner sees records: ' || count(*) from records;
select 'owner sees audit: ' || count(*) from audit_log;
\echo 'EXPECT ERROR: permission denied (Owner writes go through the function too)'
update records set data = '{}';
reset role;
\echo '--- helpers'
set request.jwt.claims = '{"email":"T1@gmail.com"}';
select 'my_role/my_mentor for T1@gmail.com: ' || public.my_role() || ' / ' || public.my_mentor();
set request.jwt.claims = '{"email":"s1@gmail.com"}';
select 'my_student for s1: ' || public.my_student();
select 'bucket: ' || id || ' public=' || public || ' limit=' || file_size_limit from storage.buckets;
select 'rls: ' || relname || ' enabled=' || relrowsecurity || ' forced=' || relforcerowsecurity from pg_class where relname in ('records','members','audit_log','app_settings') order by relname;
select 'touch: ' || (select updated_at > now() - interval '1 minute' from records where id = 'STU-1001');

-- ---------- notifications tables (added with Web Push) ----------
\echo '--- push tables: shape, guards, RLS'
insert into public.push_subs (endpoint, email, p256dh, auth) values ('https://fcm.googleapis.com/fcm/send/abc', 's1@gmail.com', repeat('B', 87), repeat('Q', 22));
do $$ begin
  begin insert into public.push_subs (endpoint, email, p256dh, auth) values ('http://evil/x', 'a@gmail.com', repeat('B', 87), repeat('Q', 22)); raise exception 'http endpoint accepted';
  exception when check_violation then null; end;
  begin insert into public.push_subs (endpoint, email, p256dh, auth) values ('https://fcm.googleapis.com/x2', 'a@gmail.com', 'short', 'x'); raise exception 'bad keys accepted';
  exception when check_violation then null; end;
end $$;
insert into public.push_queue (email, cat, payload) values ('s1@gmail.com', 'notices', '{"t":"x"}');
insert into public.push_sent (key) values ('ev:EV-1:2026-10-30') on conflict do nothing;
insert into public.push_sent (key) values ('ev:EV-1:2026-10-30') on conflict do nothing;
select (select count(*) from public.push_sent) = 1 as "reminder key once";
select (select updated_at from public.push_subs limit 1) is not null as "subs stamped";
set role anon;
do $$ begin
  begin perform 1 from public.push_subs; raise exception 'anon read push_subs'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.push_queue; raise exception 'anon read push_queue'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.app_settings; raise exception 'anon read app_settings (signing keys)'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
do $$ begin
  begin perform 1 from public.push_subs; raise exception 'user read push_subs'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.app_settings; raise exception 'user read app_settings'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'push tables: ok' as result;
