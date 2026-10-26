-- Phase 4 editor console. New write functions for archive evidence, send-back,
-- staff roles, parties, constituencies, and silence windows.
-- Reads for the console are staff-only views. They do not expose contact email.
-- This file does not update or delete audit_log.

create or replace function public.rpc_record_source_archive(
  p_source_id uuid,
  p_archived_path text,
  p_sha256 text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text := btrim(coalesce(p_archived_path, ''));
  v_hash text := lower(btrim(coalesce(p_sha256, '')));
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  perform public.app_assert_silence(null);
  if v_path = '' or v_path like '%..%' or left(v_path, 8) <> 'sources/' then
    raise exception 'archive required' using errcode = 'P0001';
  end if;
  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid archive hash' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.sources where id = p_source_id) then
    raise exception 'source not found' using errcode = 'P0001';
  end if;
  update public.sources
    set archived_path = v_path, sha256 = v_hash
    where id = p_source_id;
end;
$$;

create or replace function public.rpc_send_back(
  p_target text,
  p_id uuid,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_created uuid;
  v_status public.pub_status;
begin
  v_staff := public.app_staff(array['reviewer', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);

  if p_target = 'entry' then
    select created_by, status into v_created, v_status
    from public.entries
    where id = p_id;
    if not found then
      raise exception 'entry not found' using errcode = 'P0001';
    end if;
    if v_status <> 'pending_review' then
      raise exception 'not pending review' using errcode = 'P0001';
    end if;
    if v_created = v_staff.user_id then
      raise exception 'self-approval' using errcode = 'P0001';
    end if;
    update public.entries
      set status = 'draft', updated_at = now()
      where id = p_id;
  elsif p_target = 'case_event' then
    select created_by, status into v_created, v_status
    from public.case_events
    where id = p_id;
    if not found then
      raise exception 'case event not found' using errcode = 'P0001';
    end if;
    if v_status <> 'pending_review' then
      raise exception 'not pending review' using errcode = 'P0001';
    end if;
    if v_created = v_staff.user_id then
      raise exception 'self-approval' using errcode = 'P0001';
    end if;
    update public.case_events
      set status = 'draft'
      where id = p_id;
  else
    raise exception 'unknown send-back target' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.rpc_set_staff(
  p_user_id uuid,
  p_role public.staff_role,
  p_display_name text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_name text := btrim(coalesce(p_display_name, ''));
begin
  v_staff := public.app_staff(array['admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_user_id = v_staff.user_id then
    raise exception 'cannot change own role' using errcode = 'P0001';
  end if;
  if v_name = '' then
    raise exception 'display name required' using errcode = 'P0001';
  end if;
  if position('@' in v_name) > 0 or v_name ~ '[0-9]{10}' then
    raise exception 'personal data refused' using errcode = 'P0001';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'user not found' using errcode = 'P0001';
  end if;
  insert into public.staff (user_id, role, display_name)
  values (p_user_id, p_role, v_name)
  on conflict (user_id) do update
    set role = excluded.role, display_name = excluded.display_name;
end;
$$;

create or replace function public.rpc_remove_staff(
  p_user_id uuid,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
begin
  v_staff := public.app_staff(array['admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_user_id = v_staff.user_id then
    raise exception 'cannot remove self' using errcode = 'P0001';
  end if;
  delete from public.staff where user_id = p_user_id;
  if not found then
    raise exception 'staff not found' using errcode = 'P0001';
  end if;
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
declare
  v_id text := btrim(coalesce(p_id, ''));
  v_name text := btrim(coalesce(p_name, ''));
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  perform public.app_assert_silence(null);
  if v_id !~ '^[a-z0-9][a-z0-9-]{0,40}$' then
    raise exception 'invalid party id' using errcode = 'P0001';
  end if;
  if lower(v_name) = 'not compiled yet' or lower(v_id) = 'not compiled yet' then
    raise exception 'party is not compiled' using errcode = 'P0001';
  end if;
  if v_name = '' then
    raise exception 'name required' using errcode = 'P0001';
  end if;
  insert into public.parties (id, name, name_te)
  values (v_id, v_name, nullif(btrim(coalesce(p_name_te, '')), ''))
  on conflict (id) do update
    set name = excluded.name, name_te = excluded.name_te
    where public.parties.name is distinct from excluded.name
      or public.parties.name_te is distinct from excluded.name_te;
  return v_id;
end;
$$;

create or replace function public.rpc_save_constituency(
  p_id text,
  p_kind text,
  p_number integer,
  p_name text,
  p_name_te text,
  p_district text,
  p_reason text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := btrim(coalesce(p_id, ''));
  v_name text := btrim(coalesce(p_name, ''));
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  perform public.app_assert_silence(null);
  if v_id !~ '^[A-Za-z0-9][A-Za-z0-9-]{0,80}$' or p_kind not in ('AC', 'PC') or p_number is null or p_number < 1 or v_name = '' then
    raise exception 'invalid constituency' using errcode = 'P0001';
  end if;
  insert into public.constituencies (id, kind, number, name, name_te, district)
  values (v_id, p_kind, p_number, v_name, nullif(btrim(coalesce(p_name_te, '')), ''), nullif(btrim(coalesce(p_district, '')), ''))
  on conflict (id) do update
    set kind = excluded.kind,
        number = excluded.number,
        name = excluded.name,
        name_te = excluded.name_te,
        district = excluded.district
    where public.constituencies.kind is distinct from excluded.kind
      or public.constituencies.number is distinct from excluded.number
      or public.constituencies.name is distinct from excluded.name
      or public.constituencies.name_te is distinct from excluded.name_te
      or public.constituencies.district is distinct from excluded.district;
  return v_id;
end;
$$;

create or replace function public.rpc_save_silence_window(
  p_id uuid,
  p_constituency_ids text[],
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_note text,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.app_staff(array['admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_constituency_ids is null or cardinality(p_constituency_ids) < 1 then
    raise exception 'constituency required' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from unnest(p_constituency_ids) as seat(id)
    where not exists (select 1 from public.constituencies c where c.id = seat.id)
  ) then
    raise exception 'constituency not found' using errcode = 'P0001';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'window range' using errcode = 'P0001';
  end if;
  if p_id is null then
    insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
    values (p_constituency_ids, p_starts_at, p_ends_at, nullif(btrim(coalesce(p_note, '')), ''))
    returning id into v_id;
    return v_id;
  end if;
  update public.silence_windows
    set constituency_ids = p_constituency_ids,
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        note = nullif(btrim(coalesce(p_note, '')), '')
    where id = p_id
    returning id into v_id;
  if v_id is null then
    raise exception 'silence window not found' using errcode = 'P0001';
  end if;
  return v_id;
end;
$$;

revoke all on function public.rpc_record_source_archive(uuid, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_send_back(text, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_set_staff(uuid, public.staff_role, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_remove_staff(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_party(text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_constituency(text, text, integer, text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_silence_window(uuid, text[], timestamptz, timestamptz, text, text) from public, anon, authenticated, service_role;

grant execute on function public.rpc_record_source_archive(uuid, text, text, text) to authenticated;
grant execute on function public.rpc_send_back(text, uuid, text) to authenticated;
grant execute on function public.rpc_set_staff(uuid, public.staff_role, text, text) to authenticated;
grant execute on function public.rpc_remove_staff(uuid, text) to authenticated;
grant execute on function public.rpc_save_party(text, text, text, text) to authenticated;
grant execute on function public.rpc_save_constituency(text, text, integer, text, text, text, text) to authenticated;
grant execute on function public.rpc_save_silence_window(uuid, text[], timestamptz, timestamptz, text, text) to authenticated;

create or replace view public.v_my_staff
with (security_barrier = true, security_invoker = false) as
select user_id, role, display_name
from public.staff
where user_id = auth.uid();

create or replace view public.v_editor_entries
with (security_barrier = true, security_invoker = false) as
select
  e.id,
  e.person_id,
  p.slug as person_slug,
  p.name as person_name,
  p.constituency_id,
  e.kind,
  e.body,
  e.status,
  e.source_id,
  e.created_by,
  e.created_at
from public.entries e
join public.people p on p.id = e.person_id
where exists (select 1 from public.staff s where s.user_id = auth.uid());

create or replace view public.v_editor_sources
with (security_barrier = true, security_invoker = false) as
select id, type, url, title, publisher, published_on, archived_path, sha256
from public.sources
where exists (select 1 from public.staff s where s.user_id = auth.uid());

create or replace view public.v_editor_cases
with (security_barrier = true, security_invoker = false) as
select c.id, c.slug, c.title
from public.cases c
where exists (select 1 from public.staff s where s.user_id = auth.uid());

create or replace view public.v_editor_stale_cases
with (security_barrier = true, security_invoker = false) as
select c.id, c.slug, c.title, ev.last_at
from public.cases c
left join lateral (
  select max(e.created_at) as last_at
  from public.case_events e
  where e.case_id = c.id
) ev on true
where (ev.last_at is null or ev.last_at < now() - interval '30 days')
  and exists (select 1 from public.staff s where s.user_id = auth.uid());

create or replace view public.v_editor_review
with (security_barrier = true, security_invoker = false) as
select
  'entry'::text as target,
  e.id,
  p.name as subject,
  e.body as after_text,
  (
    select a.before->>'body'
    from public.audit_log a
    where a.table_name = 'entries' and a.row_id = e.id and a.action = 'update'
    order by a.id desc
    limit 1
  ) as before_text,
  e.created_at,
  null::uuid as case_id
from public.entries e
join public.people p on p.id = e.person_id
where e.status = 'pending_review'
  and e.created_by is distinct from auth.uid()
  and exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.role in ('reviewer', 'admin')
  )
union all
select
  'case_event'::text,
  e.id,
  c.title,
  e.note,
  (
    select a.before->>'note'
    from public.audit_log a
    where a.table_name = 'case_events' and a.row_id = e.id and a.action = 'update'
    order by a.id desc
    limit 1
  ),
  e.created_at,
  e.case_id
from public.case_events e
join public.cases c on c.id = e.case_id
where e.status = 'pending_review'
  and e.created_by is distinct from auth.uid()
  and exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.role in ('reviewer', 'admin')
  );

create or replace view public.v_editor_open_corrections
with (security_barrier = true, security_invoker = false) as
select count(*)::int as open_count
from public.corrections
where status = 'open'
  and exists (select 1 from public.staff s where s.user_id = auth.uid());

comment on view public.v_editor_open_corrections is
  'Staff count of open corrections. Contact email is not selected.';

create or replace view public.v_editor_silence
with (security_barrier = true, security_invoker = false) as
select
  id,
  constituency_ids,
  starts_at,
  ends_at,
  note,
  (now() >= starts_at and now() < ends_at) as live
from public.silence_windows
where exists (select 1 from public.staff s where s.user_id = auth.uid());

create or replace view public.v_editor_staff
with (security_barrier = true, security_invoker = false) as
select user_id, role, display_name
from public.staff
where exists (
  select 1 from public.staff me
  where me.user_id = auth.uid() and me.role = 'admin'
);

revoke all on public.v_my_staff, public.v_editor_entries, public.v_editor_sources, public.v_editor_cases,
  public.v_editor_stale_cases, public.v_editor_review, public.v_editor_open_corrections,
  public.v_editor_silence, public.v_editor_staff
  from public, anon;
grant select on public.v_my_staff, public.v_editor_entries, public.v_editor_sources, public.v_editor_cases,
  public.v_editor_stale_cases, public.v_editor_review, public.v_editor_open_corrections,
  public.v_editor_silence, public.v_editor_staff
  to authenticated;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('sources', 'sources', false)
    on conflict (id) do nothing;
  end if;
exception
  when others then
    null;
end;
$$;
