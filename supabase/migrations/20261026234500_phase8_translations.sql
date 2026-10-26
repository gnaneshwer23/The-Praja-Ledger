-- Phase 8: Telugu text is staged, then a different person approves it.
-- A staged row is not public. Approving a person name or a case title or summary
-- writes that field. A message line is recorded and does not change a public record.
-- Chrome strings stay in the message files until a translator file is committed.

alter table public.cases
  add column title_te text,
  add column summary_te text;

create table public.translation_stage (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  entity_key text not null,
  field text not null,
  english_text text not null default '',
  telugu text not null,
  status text not null default 'staged' check (status in ('staged', 'approved')),
  created_by uuid not null,
  approved_by uuid,
  created_at timestamptz not null default now(),
  constraint translation_stage_pair_check check (
    (kind = 'person' and field = 'name_te')
    or (kind = 'case' and field in ('title_te', 'summary_te'))
    or (kind = 'promise' and field = 'body_te')
    or (kind = 'message' and field = 'text')
  ),
  constraint translation_stage_text_check check (btrim(telugu) <> ''),
  constraint translation_stage_eyes check (
    status <> 'approved' or approved_by is distinct from created_by
  )
);

create unique index translation_stage_open
  on public.translation_stage (kind, entity_key, field)
  where status = 'staged';

comment on table public.translation_stage is
  'Unpublished Telugu text. A different person approves each row before a public field changes.';

create or replace function public.app_translation_prepare(
  p_kind text,
  p_key text,
  p_field text,
  p_telugu text
) returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kind text := btrim(coalesce(p_kind, ''));
  v_key text := btrim(coalesce(p_key, ''));
  v_field text := btrim(coalesce(p_field, ''));
  v_telugu text := btrim(coalesce(p_telugu, ''));
  v_person uuid;
  v_case uuid;
  v_english text;
  v_summary text;
begin
  if v_telugu = '' or char_length(v_telugu) > 8000 or char_length(v_key) > 200 or v_key = '' then
    raise exception 'telugu required' using errcode = 'P0001';
  end if;
  if v_kind is distinct from 'case' and v_telugu ~* '\m(corrupt|scam|guilty|criminal)\M' then
    raise exception 'blocked wording' using errcode = 'P0001';
  end if;
  perform public.app_reject_personal(v_telugu);

  if v_kind = 'person' and v_field = 'name_te' then
    select id, name into v_person, v_english from public.people where slug = v_key;
    if not found then
      raise exception 'record not found' using errcode = 'P0001';
    end if;
    perform public.app_assert_silence(public.app_person_constituencies(v_person));
    return coalesce(v_english, '');
  end if;

  if v_kind = 'case' and v_field in ('title_te', 'summary_te') then
    select id, title, summary into v_case, v_english, v_summary
    from public.cases
    where slug = v_key;
    if not found then
      raise exception 'record not found' using errcode = 'P0001';
    end if;
    if v_field = 'summary_te' and nullif(btrim(coalesce(v_summary, '')), '') is null then
      raise exception 'invalid translation' using errcode = 'P0001';
    end if;
    perform public.app_assert_silence(public.app_case_constituencies(v_case));
    if v_field = 'summary_te' then
      return coalesce(v_summary, '');
    end if;
    return coalesce(v_english, '');
  end if;

  if v_kind = 'promise' and v_field = 'body_te' then
    select body into v_english from public.promises where external_id = v_key;
    if not found then
      raise exception 'record not found' using errcode = 'P0001';
    end if;
    perform public.app_assert_silence(null);
    return coalesce(v_english, '');
  end if;

  if v_kind = 'message' and v_field = 'text'
     and v_key ~ '^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$' then
    perform public.app_assert_silence('{}'::text[]);
    return '';
  end if;

  raise exception 'invalid translation' using errcode = 'P0001';
end;
$$;

create or replace function public.rpc_stage_translation(
  p_kind text,
  p_key text,
  p_field text,
  p_telugu text,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_kind text := btrim(coalesce(p_kind, ''));
  v_key text := btrim(coalesce(p_key, ''));
  v_field text := btrim(coalesce(p_field, ''));
  v_telugu text := btrim(coalesce(p_telugu, ''));
  v_english text;
  v_existing public.translation_stage;
  v_id uuid;
begin
  v_staff := public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_reason ~* '\m(corrupt|scam|guilty|criminal)\M' then
    raise exception 'blocked wording' using errcode = 'P0001';
  end if;
  if v_telugu = '' then
    raise exception 'telugu required' using errcode = 'P0001';
  end if;
  v_english := public.app_translation_prepare(v_kind, v_key, v_field, v_telugu);

  select * into v_existing
  from public.translation_stage
  where kind = v_kind
    and entity_key = v_key
    and field = v_field
    and status = 'staged';
  if found then
    if v_existing.created_by <> v_staff.user_id then
      raise exception 'already staged' using errcode = 'P0001';
    end if;
    update public.translation_stage
    set telugu = v_telugu,
        english_text = v_english
    where id = v_existing.id;
    return v_existing.id;
  end if;

  insert into public.translation_stage (
    kind, entity_key, field, english_text, telugu, status, created_by
  ) values (
    v_kind, v_key, v_field, v_english, v_telugu, 'staged', v_staff.user_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_approve_translation(
  p_stage_id uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_row public.translation_stage;
  v_changed boolean := false;
  v_count integer := 0;
  v_person_slug text;
  v_seat text;
  v_case_id uuid;
  v_case_slug text;
  v_people text[] := '{}'::text[];
  v_seats text[] := '{}'::text[];
  v_cases text[] := '{}'::text[];
begin
  v_staff := public.app_staff(array['editor', 'reviewer', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if p_reason ~* '\m(corrupt|scam|guilty|criminal)\M' then
    raise exception 'blocked wording' using errcode = 'P0001';
  end if;
  select * into v_row from public.translation_stage where id = p_stage_id;
  if not found then
    raise exception 'record not found' using errcode = 'P0001';
  end if;
  if v_row.created_by = v_staff.user_id then
    raise exception 'self-approval' using errcode = 'P0001';
  end if;
  if btrim(coalesce(v_row.telugu, '')) = '' then
    raise exception 'telugu required' using errcode = 'P0001';
  end if;
  perform public.app_translation_prepare(v_row.kind, v_row.entity_key, v_row.field, v_row.telugu);

  if v_row.status = 'approved' then
    return jsonb_build_object(
      'public_changed', false,
      'person_slugs', '{}'::text[],
      'constituency_ids', '{}'::text[],
      'case_slugs', '{}'::text[]
    );
  end if;

  if v_row.kind = 'person' then
    select slug, constituency_id into v_person_slug, v_seat
    from public.people
    where slug = v_row.entity_key;
    update public.people
    set name_te = v_row.telugu,
        updated_at = now()
    where slug = v_row.entity_key
      and name_te is distinct from v_row.telugu;
    get diagnostics v_count = row_count;
    v_changed := v_count > 0;
    if v_changed then
      v_people := array[v_person_slug];
      if v_seat is not null then
        v_seats := array[v_seat];
      end if;
    end if;
  elsif v_row.kind = 'case' then
    select id, slug into v_case_id, v_case_slug
    from public.cases
    where slug = v_row.entity_key;
    if v_row.field = 'title_te' then
      update public.cases
      set title_te = v_row.telugu
      where id = v_case_id
        and title_te is distinct from v_row.telugu;
    else
      update public.cases
      set summary_te = v_row.telugu
      where id = v_case_id
        and summary_te is distinct from v_row.telugu;
    end if;
    get diagnostics v_count = row_count;
    v_changed := v_count > 0;
    if v_changed then
      v_cases := array[v_case_slug];
      select
        coalesce(array_agg(distinct p.slug), '{}'::text[]),
        coalesce(array_agg(distinct p.constituency_id) filter (where p.constituency_id is not null), '{}'::text[])
      into v_people, v_seats
      from public.case_people cp
      join public.people p on p.id = cp.person_id
      where cp.case_id = v_case_id;
    end if;
  elsif v_row.kind = 'promise' then
    update public.promises
    set body_te = v_row.telugu
    where external_id = v_row.entity_key
      and body_te is distinct from v_row.telugu;
  end if;

  update public.translation_stage
  set status = 'approved',
      approved_by = v_staff.user_id
  where id = v_row.id;

  return jsonb_build_object(
    'public_changed', v_changed,
    'person_slugs', coalesce(v_people, '{}'::text[]),
    'constituency_ids', coalesce(v_seats, '{}'::text[]),
    'case_slugs', coalesce(v_cases, '{}'::text[])
  );
end;
$$;

revoke all on function public.app_translation_prepare(text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_stage_translation(text, text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_approve_translation(uuid, text) from public, anon, authenticated, service_role;

grant execute on function public.rpc_stage_translation(text, text, text, text, text) to authenticated;
grant execute on function public.rpc_approve_translation(uuid, text) to authenticated;

create or replace view public.v_cases
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
  ) as events,
  c.title_te,
  c.summary_te
from public.cases c
where exists (
  select 1
  from public.case_events e
  where e.case_id = c.id
    and e.status = 'published'
);

create or replace view public.v_editor_translation_stage
with (security_barrier = true, security_invoker = false) as
select
  id,
  kind,
  entity_key,
  field,
  english_text,
  telugu,
  created_by,
  created_at
from public.translation_stage
where status = 'staged'
  and exists (select 1 from public.staff s where s.user_id = auth.uid());

comment on view public.v_editor_translation_stage is
  'Staged Telugu lines for a different person to approve.';

create or replace view public.v_editor_translation_gaps
with (security_barrier = true, security_invoker = false) as
select 'person'::text as kind, p.slug as entity_key, 'name_te'::text as field, p.name as english
from public.people p
where nullif(btrim(coalesce(p.name_te, '')), '') is null
  and exists (select 1 from public.staff s where s.user_id = auth.uid())
union all
select 'case'::text, c.slug, 'title_te'::text, c.title
from public.cases c
where nullif(btrim(coalesce(c.title_te, '')), '') is null
  and exists (select 1 from public.staff s where s.user_id = auth.uid())
union all
select 'case'::text, c.slug, 'summary_te'::text, c.summary
from public.cases c
where nullif(btrim(coalesce(c.summary, '')), '') is not null
  and nullif(btrim(coalesce(c.summary_te, '')), '') is null
  and exists (select 1 from public.staff s where s.user_id = auth.uid())
union all
select 'promise'::text, p.external_id, 'body_te'::text, p.body
from public.promises p
where p.external_id is not null
  and nullif(btrim(coalesce(p.body_te, '')), '') is null
  and exists (select 1 from public.staff s where s.user_id = auth.uid());

comment on view public.v_editor_translation_gaps is
  'People, cases, and promises that have no Telugu field yet.';

revoke all on public.v_editor_translation_stage, public.v_editor_translation_gaps
  from public, anon, authenticated;
grant select on public.v_editor_translation_stage, public.v_editor_translation_gaps
  to authenticated;

alter table public.translation_stage enable row level security;
revoke all on table public.translation_stage from public, anon, authenticated;

create trigger audit_translation_stage
after insert or update or delete on public.translation_stage
for each row execute function public.audit_if_reason();
