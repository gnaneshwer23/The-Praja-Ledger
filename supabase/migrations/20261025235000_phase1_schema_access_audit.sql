-- Phase 1: editorial schema, public read views, append-only audit log, and write functions.
-- No seed data. Published rows are retracted, not deleted.

create type public.source_type as enum ('COURT', 'CAG', 'ECI', 'SPKR', 'COMM', 'MEDIA', 'GOV', 'OPP', 'PARTY');
create type public.entry_kind as enum ('work', 'issue');
create type public.pub_status as enum ('draft', 'pending_review', 'published', 'retracted');
create type public.case_state as enum ('pending', 'final', 'unknown');
create type public.promise_status as enum ('delivered', 'partial', 'not', 'disputed', 'progress', 'unverified');
create type public.staff_role as enum ('editor', 'reviewer', 'admin');

create table public.parties (
  id text primary key,
  name text not null,
  name_te text
);

create table public.constituencies (
  id text primary key,
  kind text not null check (kind in ('AC', 'PC')),
  number int not null,
  name text not null,
  name_te text,
  district text
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  name_te text,
  party_id text references public.parties,
  role text,
  constituency_id text references public.constituencies,
  status_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  type public.source_type not null,
  url text,
  title text,
  publisher text,
  published_on date,
  archived_path text,
  sha256 text,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  constraint tier1_needs_url check (
    type not in ('COURT', 'CAG', 'ECI', 'SPKR') or url is not null
  )
);

create table public.affidavits (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people not null,
  election text not null,
  year int not null,
  assets_inr bigint,
  liabilities_inr bigint,
  declared_cases int,
  serious_cases int,
  source_id uuid references public.sources not null
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people not null,
  kind public.entry_kind not null,
  body text not null,
  body_te text,
  source_id uuid references public.sources not null,
  verify boolean not null default true,
  status public.pub_status not null default 'draft',
  created_by uuid,
  approved_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint four_eyes check (
    status <> 'published' or kind = 'work' or approved_by is distinct from created_by
  )
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text,
  party_id text references public.parties,
  state public.case_state not null default 'pending'
);

create table public.case_stages (
  case_id uuid references public.cases on delete cascade,
  idx int,
  label text not null,
  primary key (case_id, idx)
);

create table public.case_people (
  case_id uuid references public.cases,
  person_id uuid references public.people,
  role_in_case text,
  primary key (case_id, person_id)
);

create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases not null,
  stage_idx int,
  event_date date,
  note text not null,
  source_id uuid references public.sources not null,
  status public.pub_status not null default 'pending_review',
  created_by uuid,
  approved_by uuid,
  created_at timestamptz default now(),
  constraint case_event_four_eyes check (
    status <> 'published' or approved_by is distinct from created_by
  )
);

create table public.promises (
  id uuid primary key default gen_random_uuid(),
  manifesto text not null,
  party_id text references public.parties,
  area text,
  body text not null,
  body_te text,
  sort int
);

create table public.promise_updates (
  id uuid primary key default gen_random_uuid(),
  promise_id uuid references public.promises not null,
  status public.promise_status not null,
  detail text,
  source_id uuid references public.sources not null,
  verify boolean not null default true,
  created_by uuid,
  created_at timestamptz default now()
);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.entries not null,
  office_name text not null,
  body text not null,
  verified_by uuid,
  status public.pub_status default 'pending_review',
  created_at timestamptz default now()
);

create table public.corrections (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  body text not null,
  source_url text,
  contact_email text,
  status text not null default 'open' check (status in ('open', 'applied', 'declined')),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz default now()
);

comment on column public.corrections.contact_email is 'Never published.';

create table public.datasets (
  key text primary key,
  data jsonb not null,
  source_ids uuid[] not null,
  updated_at timestamptz default now()
);

create table public.staff (
  user_id uuid primary key references auth.users,
  role public.staff_role not null,
  display_name text not null
);

create table public.silence_windows (
  id uuid primary key default gen_random_uuid(),
  constituency_ids text[] not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text
);

create table public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_name text,
  table_name text not null,
  row_id uuid,
  action text not null,
  before jsonb,
  after jsonb,
  reason text not null
);

comment on table public.audit_log is 'Append-only. Updates and deletes are rejected.';

create table public.snapshots (
  id bigserial primary key,
  taken_at timestamptz default now(),
  storage_path text not null,
  sha256 text not null,
  prev_sha256 text
);

-- Audit. Every editorial write must set app.reason in the same transaction.
create or replace function public.audit_if_reason()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := btrim(coalesce(current_setting('app.reason', true), ''));
  v_actor uuid := auth.uid();
  v_name text;
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
  v_key text;
  v_row_id uuid;
begin
  if v_reason = '' then
    raise exception 'reason required' using errcode = 'P0001';
  end if;

  select display_name into v_name from public.staff where user_id = v_actor;

  if tg_op = 'INSERT' then
    v_after := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
  else
    v_before := to_jsonb(old);
  end if;

  v_row := coalesce(v_after, v_before);
  v_key := coalesce(v_row->>'id', v_row->>'user_id');
  if v_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_row_id := v_key::uuid;
  end if;

  insert into public.audit_log (actor, actor_name, table_name, row_id, action, before, after, reason)
  values (v_actor, v_name, tg_table_name, v_row_id, lower(tg_op), v_before, v_after, v_reason);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.prevent_published_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'entries' and old.status in ('published', 'retracted') then
    raise exception 'published content cannot be deleted' using errcode = 'P0001';
  end if;
  if tg_table_name = 'case_events' and old.status in ('published', 'retracted') then
    raise exception 'published content cannot be deleted' using errcode = 'P0001';
  end if;
  if tg_table_name = 'promise_updates' then
    raise exception 'published content cannot be deleted' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'parties', 'constituencies', 'people', 'sources', 'affidavits', 'entries',
    'cases', 'case_stages', 'case_people', 'case_events', 'promises', 'promise_updates',
    'replies', 'corrections', 'datasets', 'staff', 'silence_windows', 'snapshots'
  ]
  loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_if_reason()',
      'audit_' || t,
      t
    );
  end loop;
end;
$$;

create trigger entries_no_published_delete
before delete on public.entries
for each row execute function public.prevent_published_delete();

create trigger case_events_no_published_delete
before delete on public.case_events
for each row execute function public.prevent_published_delete();

create trigger promise_updates_no_delete
before delete on public.promise_updates
for each row execute function public.prevent_published_delete();

create or replace function public.audit_log_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_log is append-only' using errcode = 'P0001';
end;
$$;

create trigger audit_log_no_update
before update or delete on public.audit_log
for each row execute function public.audit_log_append_only();

create trigger audit_log_no_truncate
before truncate on public.audit_log
for each statement execute function public.audit_log_append_only();

revoke update, delete, truncate on public.audit_log from public, anon, authenticated, service_role;
revoke insert, select on public.audit_log from public, anon, authenticated, service_role;

-- Public reads. Views run as their owner, the default, so anon needs no grant on the base tables.
create view public.v_people
with (security_barrier = true) as
select
  id,
  slug,
  name,
  name_te,
  party_id,
  role,
  constituency_id,
  status_note,
  created_at,
  updated_at
from public.people;

create view public.v_entries
with (security_barrier = true) as
select
  id,
  person_id,
  kind,
  body,
  body_te,
  source_id,
  verify,
  status,
  created_at,
  updated_at
from public.entries
where status = 'published';

create view public.v_cases
with (security_barrier = true) as
select
  c.id,
  c.slug,
  c.title,
  c.summary,
  c.party_id,
  c.state,
  (
    select jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'stage_idx', e.stage_idx,
        'event_date', e.event_date,
        'note', e.note,
        'source_id', e.source_id,
        'created_at', e.created_at
      )
      order by e.event_date, e.created_at
    )
    from public.case_events e
    where e.case_id = c.id
      and e.status = 'published'
  ) as events
from public.cases c
where exists (
  select 1
  from public.case_events e
  where e.case_id = c.id
    and e.status = 'published'
);

create view public.v_promises
with (security_barrier = true) as
select
  p.id,
  p.manifesto,
  p.party_id,
  p.area,
  p.body,
  p.body_te,
  p.sort,
  u.status as current_status,
  u.detail,
  u.source_id,
  u.verify,
  u.created_at as updated_at
from public.promises p
join lateral (
  select status, detail, source_id, verify, created_at
  from public.promise_updates
  where promise_id = p.id
  order by created_at desc, id desc
  limit 1
) u on true;

create view public.v_changelog
with (security_barrier = true) as
select
  id,
  at,
  actor_name,
  table_name,
  row_id,
  action,
  reason
from public.audit_log;

grant select on public.v_people, public.v_entries, public.v_cases, public.v_promises, public.v_changelog
  to anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'parties', 'constituencies', 'people', 'sources', 'affidavits', 'entries',
    'cases', 'case_stages', 'case_people', 'case_events', 'promises', 'promise_updates',
    'replies', 'corrections', 'datasets', 'staff', 'silence_windows', 'audit_log', 'snapshots'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
  end loop;
end;
$$;

revoke all on sequence public.audit_log_id_seq from public, anon, authenticated;
revoke all on sequence public.snapshots_id_seq from public, anon, authenticated;

grant usage on type public.source_type, public.entry_kind, public.pub_status, public.case_state, public.promise_status
  to anon, authenticated;
