-- =====================================================================
-- FTA Command Centre · Supabase schema (run once in Supabase → SQL Editor;
-- safe to run again). The browser never reads or writes these tables
-- directly: every call goes through the Netlify Function
-- (netlify/functions/api.mjs) with the service-role key, which checks the
-- signed-in Gmail against `members` and applies the access policy.
-- Row Level Security is ON for every table with NO policies for the
-- `anon` and `authenticated` roles, so even with the public anon key
-- nobody can read or change data from outside the function.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- settings ----------
create table if not exists public.app_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
-- The Owner's Gmail. The first sign-in with this Gmail becomes the Owner.
-- Change it here (and in the Netlify environment variable OWNER_EMAIL).
insert into public.app_settings (key, value) values ('owner_email', 'owner@example.com')
  on conflict (key) do nothing;

-- ---------- who may sign in, and as what ----------
create table if not exists public.members (
  email      text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  role       text not null check (role in ('Owner','Admin','Junior Admin','Finance Manager','Collection Staff','Viewer','Mentor','Student')),
  mentor_id  text,
  student_id text,
  name       text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  constraint members_mentor_has_id  check (role <> 'Mentor'  or mentor_id  is not null),
  constraint members_student_has_id check (role <> 'Student' or student_id is not null)
);
create unique index if not exists members_one_mentor  on public.members (mentor_id)  where role = 'Mentor';
create unique index if not exists members_one_student on public.members (student_id) where role = 'Student';

-- ---------- every record of the app (students, payments, attendance, …) ----------
create table if not exists public.records (
  collection  text not null check (collection ~ '^[a-z][a-z0-9_]{1,30}$'),
  id          text not null check (length(id) between 1 and 200),
  data        jsonb not null default '{}'::jsonb,
  mentor_ids  text[] not null default '{}',
  student_ids text[] not null default '{}',
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (collection, id)
);
create index if not exists records_updated_at on public.records (updated_at);
create index if not exists records_mentors  on public.records using gin (mentor_ids);
create index if not exists records_students on public.records using gin (student_ids);

-- ---------- audit trail: append only ----------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  email       text,
  role        text,
  action      text not null,
  collection  text,
  record_id   text
);

-- ---------- stamps and guards ----------
create or replace function public.fta_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records for each row execute function public.fta_touch();
drop trigger if exists members_touch on public.members;
create trigger members_touch before insert or update on public.members for each row execute function public.fta_touch();
drop trigger if exists settings_touch on public.app_settings;
create trigger settings_touch before insert or update on public.app_settings for each row execute function public.fta_touch();

-- the audit trail can never be changed or deleted (not even through the API)
create or replace function public.fta_no_change() returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;
drop trigger if exists audit_no_update on public.audit_log;
create trigger audit_no_update before update or delete on public.audit_log for each row execute function public.fta_no_change();

-- the Owner row can never be deleted, deactivated or demoted while it is the only Owner
create or replace function public.fta_keep_owner() returns trigger language plpgsql as $$
begin
  if (tg_op = 'DELETE' and old.role = 'Owner') or (tg_op = 'UPDATE' and old.role = 'Owner' and (new.role <> 'Owner' or not new.active)) then
    if (select count(*) from public.members where role = 'Owner' and active and email <> old.email) = 0 then
      raise exception 'The academy must keep at least one active Owner';
    end if;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists members_keep_owner on public.members;
create trigger members_keep_owner before update or delete on public.members for each row execute function public.fta_keep_owner();

-- ---------- helpers (for Supabase dashboard queries and future direct access) ----------
create or replace function public.my_email() returns text language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;
create or replace function public.my_role() returns text language sql stable security definer set search_path = public as $$
  select role from public.members where email = public.my_email() and active $$;
create or replace function public.my_mentor() returns text language sql stable security definer set search_path = public as $$
  select mentor_id from public.members where email = public.my_email() and active and role = 'Mentor' $$;
create or replace function public.my_student() returns text language sql stable security definer set search_path = public as $$
  select student_id from public.members where email = public.my_email() and active and role = 'Student' $$;
revoke all on function public.my_email(), public.my_role(), public.my_mentor(), public.my_student() from public, anon;
grant execute on function public.my_email(), public.my_role(), public.my_mentor(), public.my_student() to authenticated, service_role;

-- ---------- Row Level Security: ON, deny by default ----------
alter table public.app_settings enable row level security;
alter table public.members      enable row level security;
alter table public.records      enable row level security;
alter table public.audit_log    enable row level security;
alter table public.app_settings force row level security;
alter table public.members      force row level security;
alter table public.records      force row level security;
alter table public.audit_log    force row level security;
revoke all on public.app_settings, public.members, public.records, public.audit_log from anon, authenticated;
revoke all on sequence public.audit_log_id_seq from anon, authenticated;
-- Only the Owner may look at the raw tables with a normal (non-service) session, read-only.
drop policy if exists owner_reads_records on public.records;
create policy owner_reads_records on public.records for select to authenticated using (public.my_role() = 'Owner');
drop policy if exists owner_reads_members on public.members;
create policy owner_reads_members on public.members for select to authenticated using (public.my_role() = 'Owner');
drop policy if exists owner_reads_audit on public.audit_log;
create policy owner_reads_audit on public.audit_log for select to authenticated using (public.my_role() = 'Owner');
grant select on public.records, public.members, public.audit_log to authenticated;
-- (no insert / update / delete grants: all writes go through the function)

-- ---------- private file storage (homework, payment proofs, logo) ----------
insert into storage.buckets (id, name, public, file_size_limit)
  values ('files', 'files', false, 26214400)
  on conflict (id) do update set public = false, file_size_limit = 26214400;
-- No storage policies for anon/authenticated: files are uploaded and read only
-- through short-lived signed URLs that the function issues after checking the role.

-- ---------- convenience view for the Owner in the dashboard ----------
create or replace view public.records_summary with (security_invoker = true) as
  select collection, count(*) filter (where not deleted) as live, count(*) filter (where deleted) as deleted, max(updated_at) as last_change
  from public.records group by collection;

-- =====================================================================
-- Notifications (phones and laptops) · added for Web Push
-- push_subs   one row per device that turned notifications on
-- push_queue  notifications waiting to be sent (sent at once, retried every few minutes)
-- push_sent   reminders already sent (so a reminder is never sent twice)
-- Same rule as above: RLS on, no policies; only the Netlify functions touch them.
-- The signing keys (VAPID) are made automatically on first use and kept in app_settings.
-- =====================================================================
create table if not exists public.push_subs (
  endpoint   text primary key check (endpoint ~ '^https://' and length(endpoint) < 1000),
  email      text not null,
  p256dh     text not null check (length(p256dh) between 80 and 100),
  auth       text not null check (length(auth) between 16 and 30),
  prefs      jsonb not null default '{}'::jsonb,
  ua         text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_ok    timestamptz,
  fails      int not null default 0
);
create index if not exists push_subs_email on public.push_subs (email);
drop trigger if exists push_subs_touch on public.push_subs;
create trigger push_subs_touch before insert or update on public.push_subs for each row execute function public.fta_touch();

create table if not exists public.push_queue (
  id         bigint generated always as identity primary key,
  email      text not null,
  cat        text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  tries      int not null default 0
);
create index if not exists push_queue_open on public.push_queue (created_at) where claimed_at is null;

create table if not exists public.push_sent (
  key text primary key,
  at  timestamptz not null default now()
);

alter table public.push_subs  enable row level security;
alter table public.push_queue enable row level security;
alter table public.push_sent  enable row level security;
alter table public.push_subs  force row level security;
alter table public.push_queue force row level security;
alter table public.push_sent  force row level security;
revoke all on public.push_subs, public.push_queue, public.push_sent from anon, authenticated;
revoke all on sequence public.push_queue_id_seq from anon, authenticated;
-- the signing keys must never be readable outside the functions
revoke all on public.app_settings from anon, authenticated;
