-- Import paths for the compiled static edition.
-- This is not the Claude register export (27 people, 9 cases, 24 promises).
-- That export is still missing. These functions add the rows the static edition can support.
-- Issue rows stay pending until a different reviewer calls rpc_approve.

alter table public.entries add column if not exists external_id text;
alter table public.entries add column if not exists title text;
alter table public.entries add column if not exists status_line text;
alter table public.entries add column if not exists section text;
alter table public.entries add column if not exists tone text;

create unique index if not exists entries_external_id_key
  on public.entries (external_id)
  where external_id is not null;

alter table public.promises add column if not exists external_id text;
alter table public.promises add column if not exists title text;

create unique index if not exists promises_external_id_key
  on public.promises (external_id)
  where external_id is not null;

create or replace view public.v_entries
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
  updated_at,
  external_id,
  title,
  status_line,
  section,
  tone
from public.entries
where status = 'published';

create or replace view public.v_promises
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
  u.created_at as updated_at,
  p.external_id,
  p.title
from public.promises p
join lateral (
  select status, detail, source_id, verify, created_at
  from public.promise_updates
  where promise_id = p.id
  order by created_at desc, id desc
  limit 1
) u on true;

create or replace view public.v_sources
with (security_barrier = true) as
select id, type, url, title, publisher, published_on
from public.sources;

create or replace view public.v_parties
with (security_barrier = true) as
select id, name, name_te
from public.parties;

create or replace view public.v_constituencies
with (security_barrier = true) as
select id, kind, number, name, name_te, district
from public.constituencies;

create or replace view public.v_case_stages
with (security_barrier = true) as
select case_id, idx, label
from public.case_stages;

create or replace view public.v_datasets
with (security_barrier = true) as
select key, data, source_ids, updated_at
from public.datasets;

grant select on public.v_entries, public.v_promises, public.v_sources, public.v_parties,
  public.v_constituencies, public.v_case_stages, public.v_datasets
  to anon, authenticated;

-- Staff accounts for the import. Issues are approved by system-reviewer, not by the author.
select set_config(
  'app.reason',
  'Initial import of the compiled static edition, 25 Oct 2026. The Claude register export was not in supabase/seed/register.json.',
  true
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'system-import@praja-ledger.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
where not exists (
  select 1 from auth.users where id = 'a1111111-1111-4111-8111-111111111111'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000',
  'a2222222-2222-4222-8222-222222222222',
  'authenticated',
  'authenticated',
  'system-reviewer@praja-ledger.local',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
where not exists (
  select 1 from auth.users where id = 'a2222222-2222-4222-8222-222222222222'
);

insert into public.staff (user_id, role, display_name)
select 'a1111111-1111-4111-8111-111111111111', 'editor', 'system-import'
where not exists (
  select 1 from public.staff where user_id = 'a1111111-1111-4111-8111-111111111111'
);

insert into public.staff (user_id, role, display_name)
select 'a2222222-2222-4222-8222-222222222222', 'reviewer', 'system-reviewer'
where not exists (
  select 1 from public.staff where user_id = 'a2222222-2222-4222-8222-222222222222'
);

create or replace function public.rpc_import_source(
  p_type public.source_type,
  p_url text,
  p_title text,
  p_publisher text,
  p_published_on date,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_id uuid;
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_type in ('COURT', 'CAG', 'ECI', 'SPKR') and v_url is null then
    raise exception 'tier-1 source requires a url' using errcode = '23514';
  end if;
  perform public.app_assert_silence(null);
  select id into v_id
  from public.sources
  where type = p_type
    and coalesce(url, '') = coalesce(v_url, '')
    and coalesce(title, '') = coalesce(p_title, '');
  if found then
    return v_id;
  end if;
  return public.rpc_save_source(p_type, v_url, p_title, p_publisher, p_published_on, p_reason);
end;
$$;

create or replace function public.rpc_import_entry(
  p_external_id text,
  p_person_id uuid,
  p_kind public.entry_kind,
  p_body text,
  p_body_te text,
  p_source_id uuid,
  p_title text,
  p_status_line text,
  p_section text,
  p_tone text,
  p_verify boolean,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_verify boolean;
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if nullif(btrim(coalesce(p_external_id, '')), '') is null then
    raise exception 'external id required' using errcode = 'P0001';
  end if;

  select id, verify into v_id, v_verify
  from public.entries
  where external_id = p_external_id;
  if found then
    if coalesce(p_verify, false) and v_verify is not true then
      update public.entries set verify = true, updated_at = now() where id = v_id;
    end if;
    return v_id;
  end if;

  v_id := public.rpc_save_entry(
    p_person_id, p_kind, p_body, p_body_te, p_source_id, p_reason
  );
  update public.entries
    set
      external_id = p_external_id,
      title = p_title,
      status_line = p_status_line,
      section = p_section,
      tone = p_tone,
      verify = case when coalesce(p_verify, false) then true else verify end,
      updated_at = now()
    where id = v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_save_party(
  p_id text,
  p_name text,
  p_name_te text,
  p_reason text
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if nullif(btrim(coalesce(p_id, '')), '') is null or nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'party required' using errcode = 'P0001';
  end if;
  if lower(btrim(p_name)) = 'not compiled yet' or lower(btrim(p_id)) = 'not compiled yet' then
    raise exception 'party is not compiled' using errcode = 'P0001';
  end if;
  perform public.app_assert_silence(null);
  if exists (select 1 from public.parties where id = p_id) then
    return p_id;
  end if;
  insert into public.parties (id, name, name_te) values (p_id, p_name, p_name_te);
  return p_id;
end;
$$;

create or replace function public.rpc_save_constituency(
  p_id text,
  p_kind text,
  p_number int,
  p_name text,
  p_name_te text,
  p_district text,
  p_reason text
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_kind not in ('AC', 'PC') then
    raise exception 'constituency kind' using errcode = 'P0001';
  end if;
  perform public.app_assert_silence(null);
  if exists (select 1 from public.constituencies where id = p_id) then
    return p_id;
  end if;
  insert into public.constituencies (id, kind, number, name, name_te, district)
  values (p_id, p_kind, p_number, p_name, p_name_te, p_district);
  return p_id;
end;
$$;

create or replace function public.rpc_save_person(
  p_slug text,
  p_name text,
  p_name_te text,
  p_party_id text,
  p_role text,
  p_constituency_id text,
  p_status_note text,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_constituencies text[];
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_party_id is not null and (
    lower(btrim(p_party_id)) = 'not compiled yet'
    or not exists (select 1 from public.parties where id = p_party_id)
  ) then
    raise exception 'party is not compiled' using errcode = 'P0001';
  end if;
  select id into v_id from public.people where slug = p_slug;
  if found then
    return v_id;
  end if;
  if p_constituency_id is null then
    v_constituencies := '{}'::text[];
  else
    v_constituencies := array[p_constituency_id];
  end if;
  perform public.app_assert_silence(v_constituencies);
  insert into public.people (slug, name, name_te, party_id, role, constituency_id, status_note)
  values (p_slug, p_name, p_name_te, p_party_id, p_role, p_constituency_id, p_status_note)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_save_case(
  p_slug text,
  p_title text,
  p_summary text,
  p_party_id text,
  p_state public.case_state,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_party_id is not null and lower(btrim(p_party_id)) = 'not compiled yet' then
    raise exception 'party is not compiled' using errcode = 'P0001';
  end if;
  select id into v_id from public.cases where slug = p_slug;
  if found then
    return v_id;
  end if;
  perform public.app_assert_silence(null);
  insert into public.cases (slug, title, summary, party_id, state)
  values (p_slug, p_title, p_summary, p_party_id, p_state)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_save_case_stage(
  p_case_id uuid,
  p_idx int,
  p_label text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if exists (
    select 1 from public.case_stages where case_id = p_case_id and idx = p_idx
  ) then
    return;
  end if;
  perform public.app_assert_silence(public.app_case_constituencies(p_case_id));
  insert into public.case_stages (case_id, idx, label) values (p_case_id, p_idx, p_label);
end;
$$;

create or replace function public.rpc_link_case_person(
  p_case_id uuid,
  p_person_id uuid,
  p_role_in_case text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if exists (
    select 1 from public.case_people where case_id = p_case_id and person_id = p_person_id
  ) then
    return;
  end if;
  perform public.app_assert_silence(public.app_person_constituencies(p_person_id));
  insert into public.case_people (case_id, person_id, role_in_case)
  values (p_case_id, p_person_id, p_role_in_case);
end;
$$;

create or replace function public.rpc_save_promise(
  p_external_id text,
  p_manifesto text,
  p_party_id text,
  p_area text,
  p_body text,
  p_body_te text,
  p_sort int,
  p_title text,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if v_body = '' or lower(v_body) = 'not compiled yet' then
    raise exception 'promise body is not compiled' using errcode = 'P0001';
  end if;
  if p_party_id is not null and lower(btrim(p_party_id)) = 'not compiled yet' then
    raise exception 'party is not compiled' using errcode = 'P0001';
  end if;
  select id into v_id from public.promises where external_id = p_external_id;
  if found then
    return v_id;
  end if;
  perform public.app_assert_silence(null);
  insert into public.promises (manifesto, party_id, area, body, body_te, sort, external_id, title)
  values (p_manifesto, p_party_id, p_area, p_body, p_body_te, p_sort, p_external_id, p_title)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_save_dataset(
  p_key text,
  p_data jsonb,
  p_source_ids uuid[],
  p_reason text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source uuid;
  v_type public.source_type;
  v_url text;
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_source_ids is null then
    raise exception 'source required' using errcode = 'P0001';
  end if;
  foreach v_source in array p_source_ids loop
    select type, url into v_type, v_url from public.sources where id = v_source;
    if not found then
      raise exception 'source required' using errcode = 'P0001';
    end if;
    if v_type in ('COURT', 'CAG', 'ECI', 'SPKR') and nullif(btrim(coalesce(v_url, '')), '') is null then
      raise exception 'tier-1 source requires a url' using errcode = '23514';
    end if;
  end loop;
  perform public.app_assert_silence(null);
  if exists (select 1 from public.datasets where key = p_key) then
    return p_key;
  end if;
  insert into public.datasets (key, data, source_ids) values (p_key, p_data, p_source_ids);
  return p_key;
end;
$$;

revoke all on function public.rpc_import_source(public.source_type, text, text, text, date, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_import_entry(text, uuid, public.entry_kind, text, text, uuid, text, text, text, text, boolean, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_party(text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_constituency(text, text, integer, text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_person(text, text, text, text, text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_case(text, text, text, text, public.case_state, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_case_stage(uuid, integer, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_link_case_person(uuid, uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_promise(text, text, text, text, text, text, integer, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_dataset(text, jsonb, uuid[], text) from public, anon, authenticated, service_role;

grant execute on function public.rpc_import_source(public.source_type, text, text, text, date, text) to authenticated;
grant execute on function public.rpc_import_entry(text, uuid, public.entry_kind, text, text, uuid, text, text, text, text, boolean, text) to authenticated;
grant execute on function public.rpc_save_party(text, text, text, text) to authenticated;
grant execute on function public.rpc_save_constituency(text, text, integer, text, text, text, text) to authenticated;
grant execute on function public.rpc_save_person(text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.rpc_save_case(text, text, text, text, public.case_state, text) to authenticated;
grant execute on function public.rpc_save_case_stage(uuid, integer, text, text) to authenticated;
grant execute on function public.rpc_link_case_person(uuid, uuid, text, text) to authenticated;
grant execute on function public.rpc_save_promise(text, text, text, text, text, text, integer, text, text) to authenticated;
grant execute on function public.rpc_save_dataset(text, jsonb, uuid[], text) to authenticated;
