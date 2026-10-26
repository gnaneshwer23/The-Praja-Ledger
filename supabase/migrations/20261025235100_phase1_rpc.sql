-- Write path. Callers pass a non-empty reason. The function sets app.reason for the audit trigger.
-- A source or promise has no constituency: any open silence window blocks that write.
-- An entry or case event is blocked when its constituency is inside a window.

create or replace function public.app_staff(p_allowed public.staff_role[])
returns public.staff
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
begin
  select * into v_staff from public.staff where user_id = auth.uid();
  if v_staff.user_id is null or not (v_staff.role = any (p_allowed)) then
    raise exception 'forbidden role' using errcode = '42501';
  end if;
  return v_staff;
end;
$$;

create or replace function public.app_require_reason(p_reason text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_reason = '' then
    raise exception 'reason required' using errcode = 'P0001';
  end if;
  perform set_config('app.reason', v_reason, true);
  return v_reason;
end;
$$;

create or replace function public.app_assert_source(p_source_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_type public.source_type;
  v_url text;
begin
  select type, url into v_type, v_url from public.sources where id = p_source_id;
  if not found then
    raise exception 'source required' using errcode = 'P0001';
  end if;
  if v_type in ('COURT', 'CAG', 'ECI', 'SPKR') and nullif(btrim(coalesce(v_url, '')), '') is null then
    raise exception 'tier-1 source requires a url' using errcode = '23514';
  end if;
end;
$$;

-- Null means the write is not tied to one constituency, so any open window blocks it.
-- An empty array means the person has no constituency, so no window matches.
create or replace function public.app_assert_silence(p_constituency_ids text[])
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_constituency_ids is null then
    if exists (
      select 1 from public.silence_windows
      where now() >= starts_at and now() < ends_at
    ) then
      raise exception 'silence window' using errcode = 'P0001';
    end if;
    return;
  end if;

  if exists (
    select 1 from public.silence_windows w
    where now() >= starts_at
      and now() < ends_at
      and w.constituency_ids && p_constituency_ids
  ) then
    raise exception 'silence window' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.app_person_constituencies(p_person_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_constituency text;
begin
  select constituency_id into v_constituency from public.people where id = p_person_id;
  if not found then
    raise exception 'person not found' using errcode = 'P0001';
  end if;
  if v_constituency is null then
    return '{}'::text[];
  end if;
  return array[v_constituency];
end;
$$;

create or replace function public.app_case_constituencies(p_case_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ids text[];
begin
  select array_agg(distinct p.constituency_id) filter (where p.constituency_id is not null)
    into v_ids
  from public.case_people cp
  join public.people p on p.id = cp.person_id
  where cp.case_id = p_case_id;

  if v_ids is null then
    return null;
  end if;
  return v_ids;
end;
$$;

create or replace function public.rpc_save_source(
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
  v_staff public.staff;
  v_id uuid;
begin
  v_staff := public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_type in ('COURT', 'CAG', 'ECI', 'SPKR') and nullif(btrim(coalesce(p_url, '')), '') is null then
    raise exception 'tier-1 source requires a url' using errcode = '23514';
  end if;
  perform public.app_assert_silence(null);
  insert into public.sources (type, url, title, publisher, published_on, created_by)
  values (p_type, nullif(btrim(coalesce(p_url, '')), ''), p_title, p_publisher, p_published_on, v_staff.user_id)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_save_entry(
  p_person_id uuid,
  p_kind public.entry_kind,
  p_body text,
  p_body_te text,
  p_source_id uuid,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_url text;
  v_id uuid;
  v_status public.pub_status;
  v_approved uuid;
begin
  v_staff := public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  perform public.app_assert_source(p_source_id);
  perform public.app_assert_silence(public.app_person_constituencies(p_person_id));
  select url into v_url from public.sources where id = p_source_id;
  if p_kind = 'issue' then
    v_status := 'pending_review';
    v_approved := null;
  else
    v_status := 'published';
    v_approved := v_staff.user_id;
  end if;
  insert into public.entries (
    person_id, kind, body, body_te, source_id, verify, status, created_by, approved_by
  ) values (
    p_person_id,
    p_kind,
    p_body,
    p_body_te,
    p_source_id,
    nullif(btrim(coalesce(v_url, '')), '') is null,
    v_status,
    v_staff.user_id,
    v_approved
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_approve(
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
  v_kind public.entry_kind;
  v_source uuid;
  v_person uuid;
  v_case uuid;
begin
  v_staff := public.app_staff(array['reviewer', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);

  if p_target = 'entry' then
    select created_by, status, kind, source_id, person_id
      into v_created, v_status, v_kind, v_source, v_person
    from public.entries
    where id = p_id;
    if not found then
      raise exception 'entry not found' using errcode = 'P0001';
    end if;
    if v_kind <> 'issue' then
      raise exception 'work entries are not reviewed' using errcode = 'P0001';
    end if;
    if v_status <> 'pending_review' then
      raise exception 'not pending review' using errcode = 'P0001';
    end if;
    if v_created = v_staff.user_id then
      raise exception 'self-approval' using errcode = 'P0001';
    end if;
    perform public.app_assert_source(v_source);
    perform public.app_assert_silence(public.app_person_constituencies(v_person));
    update public.entries
      set status = 'published', approved_by = v_staff.user_id, updated_at = now()
      where id = p_id;
  elsif p_target = 'case_event' then
    select created_by, status, source_id, case_id
      into v_created, v_status, v_source, v_case
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
    perform public.app_assert_source(v_source);
    perform public.app_assert_silence(public.app_case_constituencies(v_case));
    update public.case_events
      set status = 'published', approved_by = v_staff.user_id
      where id = p_id;
  else
    raise exception 'unknown approval target' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.rpc_retract(
  p_entry_id uuid,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.pub_status;
  v_source uuid;
  v_person uuid;
begin
  perform public.app_staff(array['editor', 'reviewer', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  select status, source_id, person_id
    into v_status, v_source, v_person
  from public.entries
  where id = p_entry_id;
  if not found then
    raise exception 'entry not found' using errcode = 'P0001';
  end if;
  if v_status <> 'published' then
    raise exception 'not published' using errcode = 'P0001';
  end if;
  perform public.app_assert_source(v_source);
  perform public.app_assert_silence(public.app_person_constituencies(v_person));
  update public.entries
    set status = 'retracted', updated_at = now()
    where id = p_entry_id;
end;
$$;

create or replace function public.rpc_add_case_event(
  p_case_id uuid,
  p_stage_idx int,
  p_event_date date,
  p_note text,
  p_source_id uuid,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_id uuid;
begin
  v_staff := public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if not exists (select 1 from public.cases where id = p_case_id) then
    raise exception 'case not found' using errcode = 'P0001';
  end if;
  perform public.app_assert_source(p_source_id);
  perform public.app_assert_silence(public.app_case_constituencies(p_case_id));
  insert into public.case_events (
    case_id, stage_idx, event_date, note, source_id, status, created_by, approved_by
  ) values (
    p_case_id, p_stage_idx, p_event_date, p_note, p_source_id, 'pending_review', v_staff.user_id, null
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_update_promise(
  p_promise_id uuid,
  p_status public.promise_status,
  p_detail text,
  p_source_id uuid,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_url text;
  v_id uuid;
begin
  v_staff := public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if not exists (select 1 from public.promises where id = p_promise_id) then
    raise exception 'promise not found' using errcode = 'P0001';
  end if;
  perform public.app_assert_source(p_source_id);
  perform public.app_assert_silence(null);
  select url into v_url from public.sources where id = p_source_id;
  insert into public.promise_updates (promise_id, status, detail, source_id, verify, created_by)
  values (
    p_promise_id,
    p_status,
    p_detail,
    p_source_id,
    nullif(btrim(coalesce(v_url, '')), '') is null,
    v_staff.user_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.app_staff(public.staff_role[]) from public, anon, authenticated, service_role;
revoke all on function public.app_require_reason(text) from public, anon, authenticated, service_role;
revoke all on function public.app_assert_source(uuid) from public, anon, authenticated, service_role;
revoke all on function public.app_assert_silence(text[]) from public, anon, authenticated, service_role;
revoke all on function public.app_person_constituencies(uuid) from public, anon, authenticated, service_role;
revoke all on function public.app_case_constituencies(uuid) from public, anon, authenticated, service_role;
revoke all on function public.audit_if_reason() from public, anon, authenticated, service_role;
revoke all on function public.audit_log_append_only() from public, anon, authenticated, service_role;
revoke all on function public.prevent_published_delete() from public, anon, authenticated, service_role;

revoke all on function public.rpc_save_source(public.source_type, text, text, text, date, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_save_entry(uuid, public.entry_kind, text, text, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_approve(text, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_retract(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_add_case_event(uuid, integer, date, text, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_update_promise(uuid, public.promise_status, text, uuid, text) from public, anon, authenticated, service_role;

grant execute on function public.rpc_save_source(public.source_type, text, text, text, date, text) to authenticated;
grant execute on function public.rpc_save_entry(uuid, public.entry_kind, text, text, uuid, text) to authenticated;
grant execute on function public.rpc_approve(text, uuid, text) to authenticated;
grant execute on function public.rpc_retract(uuid, text) to authenticated;
grant execute on function public.rpc_add_case_event(uuid, integer, date, text, uuid, text) to authenticated;
grant execute on function public.rpc_update_promise(uuid, public.promise_status, text, uuid, text) to authenticated;
