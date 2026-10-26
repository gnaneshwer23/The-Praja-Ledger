-- Phase 7: constituency reservation, unpublished affidavit staging, and confirm-to-publish.
-- A staged row is not public. Confirming it is a separate editor, and it writes through these functions.
-- Reservation stays on constituencies. Affidavit rows keep a source URL and a PDF page.

alter table public.constituencies
  add column reservation_category text;

alter table public.constituencies
  add constraint constituencies_reservation_check
  check (
    reservation_category is null
    or reservation_category in ('General', 'SC', 'ST')
  );

alter table public.affidavits
  add column constituency_id text references public.constituencies,
  add column page_number integer,
  add column person_key text,
  add column file_key text;

alter table public.affidavits
  alter column person_id drop not null;

alter table public.affidavits
  add constraint affidavits_subject_check
  check (person_id is not null or constituency_id is not null);

alter table public.affidavits
  add constraint affidavits_page_check
  check (page_number is null or page_number >= 1);

create unique index affidavits_identity_key
  on public.affidavits (constituency_id, person_key, year, page_number, source_id)
  where constituency_id is not null
    and person_key is not null
    and page_number is not null;

create table public.affidavit_stage (
  id uuid primary key default gen_random_uuid(),
  row_key text not null unique,
  constituency_id text not null references public.constituencies,
  person_name text not null,
  person_key text not null,
  party_name text,
  person_slug text,
  election text not null,
  year integer not null,
  assets_inr bigint,
  liabilities_inr bigint,
  declared_cases integer,
  serious_cases integer,
  source_url text not null,
  page_number integer not null,
  file_key text not null,
  status text not null default 'staged' check (status in ('staged', 'confirmed')),
  created_by uuid not null,
  confirmed_by uuid,
  affidavit_id uuid references public.affidavits,
  created_at timestamptz not null default now(),
  constraint affidavit_stage_page_check check (page_number >= 1),
  constraint affidavit_stage_url_check check (source_url ~ '^https://'),
  constraint affidavit_stage_file_check check (file_key ~ '^[0-9a-f]{64}$')
);

comment on table public.affidavit_stage is
  'Unpublished affidavit rows. A different editor confirms each row before it is public.';

create table public.affidavit_changes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people,
  constituency_id text not null references public.constituencies,
  earlier_affidavit_id uuid not null references public.affidavits,
  later_affidavit_id uuid not null references public.affidavits,
  file_key text not null,
  assets_earlier_inr bigint,
  assets_later_inr bigint,
  assets_delta_inr bigint,
  liabilities_earlier_inr bigint,
  liabilities_later_inr bigint,
  liabilities_delta_inr bigint,
  declared_cases_earlier integer,
  declared_cases_later integer,
  declared_cases_delta integer,
  serious_cases_earlier integer,
  serious_cases_later integer,
  serious_cases_delta integer,
  formula text not null,
  label text not null default 'Calculated by Praja Ledger',
  created_at timestamptz not null default now(),
  constraint affidavit_changes_label_check check (label = 'Calculated by Praja Ledger'),
  constraint affidavit_changes_pair_check check (earlier_affidavit_id <> later_affidavit_id),
  constraint affidavit_changes_file_check check (file_key ~ '^[0-9a-f]{64}$'),
  unique (earlier_affidavit_id, later_affidavit_id)
);

comment on table public.affidavit_changes is
  'A difference calculated only when both affidavits were in the same supplied file.';

create or replace function public.app_name_key(p_name text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(btrim(coalesce(p_name, ''))), '[^a-z0-9]+', '', 'g')
$$;

create or replace function public.app_reject_personal(p_value text)
returns void
language plpgsql
immutable
as $$
declare
  v_value text := lower(coalesce(p_value, ''));
begin
  if v_value = '' then
    return;
  end if;
  if v_value ~ '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[a-z]{2,}' then
    raise exception 'personal data' using errcode = 'P0001';
  end if;
  if v_value ~ '(^|[^0-9])[0-9]{10}([^0-9]|$)' then
    raise exception 'personal data' using errcode = 'P0001';
  end if;
  if v_value ~ '\m(aadhaar|aadhar|pan|bank|phone|mobile|address|religion|caste|voter|epic)\M' then
    raise exception 'personal data' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.rpc_set_constituency_reservation(
  p_id text,
  p_category text,
  p_reason text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := btrim(coalesce(p_id, ''));
  v_category text := btrim(coalesce(p_category, ''));
begin
  perform public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if v_category ilike 'general' then
    v_category := 'General';
  elsif v_category ilike 'sc' then
    v_category := 'SC';
  elsif v_category ilike 'st' then
    v_category := 'ST';
  else
    raise exception 'invalid reservation' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.constituencies where id = v_id) then
    raise exception 'invalid constituency' using errcode = 'P0001';
  end if;
  perform public.app_assert_silence(array[v_id]);
  update public.constituencies
  set reservation_category = v_category
  where id = v_id
    and reservation_category is distinct from v_category;
  return v_id;
end;
$$;

create or replace function public.rpc_stage_affidavit(
  p_constituency_id text,
  p_person_name text,
  p_party_name text,
  p_person_slug text,
  p_election text,
  p_year integer,
  p_assets_inr bigint,
  p_liabilities_inr bigint,
  p_declared_cases integer,
  p_serious_cases integer,
  p_source_url text,
  p_page_number integer,
  p_file_key text,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_constituency text := btrim(coalesce(p_constituency_id, ''));
  v_name text := btrim(coalesce(p_person_name, ''));
  v_party text := nullif(btrim(coalesce(p_party_name, '')), '');
  v_slug text := nullif(btrim(coalesce(p_person_slug, '')), '');
  v_election text := btrim(coalesce(p_election, ''));
  v_url text := btrim(coalesce(p_source_url, ''));
  v_file text := lower(btrim(coalesce(p_file_key, '')));
  v_key text;
  v_existing public.affidavit_stage;
  v_id uuid;
begin
  v_staff := public.app_staff(array['editor', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if v_url = '' or left(v_url, 8) <> 'https://' then
    raise exception 'tier-1 source requires a url' using errcode = '23514';
  end if;
  if p_page_number is null or p_page_number < 1 then
    raise exception 'page number required' using errcode = 'P0001';
  end if;
  if v_name = '' then
    raise exception 'name required' using errcode = 'P0001';
  end if;
  if v_election = '' or p_year is null or p_year < 1950 or p_year > 2100 then
    raise exception 'invalid year' using errcode = 'P0001';
  end if;
  if v_file !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid file' using errcode = 'P0001';
  end if;
  if v_slug is not null and v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid constituency' using errcode = 'P0001';
  end if;
  if coalesce(p_assets_inr, 0) < 0
    or coalesce(p_liabilities_inr, 0) < 0
    or coalesce(p_declared_cases, 0) < 0
    or coalesce(p_serious_cases, 0) < 0 then
    raise exception 'invalid amount' using errcode = 'P0001';
  end if;
  if lower(v_party) = 'not compiled yet' then
    v_party := null;
  end if;
  perform public.app_reject_personal(v_name);
  perform public.app_reject_personal(v_party);
  perform public.app_reject_personal(v_election);
  if not exists (select 1 from public.constituencies where id = v_constituency) then
    raise exception 'invalid constituency' using errcode = 'P0001';
  end if;
  perform public.app_assert_silence(array[v_constituency]);
  v_key := v_constituency || '|' || public.app_name_key(v_name) || '|' || p_year::text || '|' || v_url || '|' || p_page_number::text;
  select * into v_existing from public.affidavit_stage where row_key = v_key;
  if found then
    if v_existing.party_name is distinct from v_party
      or v_existing.person_slug is distinct from v_slug
      or v_existing.election is distinct from v_election
      or v_existing.assets_inr is distinct from p_assets_inr
      or v_existing.liabilities_inr is distinct from p_liabilities_inr
      or v_existing.declared_cases is distinct from p_declared_cases
      or v_existing.serious_cases is distinct from p_serious_cases
      or v_existing.file_key is distinct from v_file then
      raise exception 'staged row differs' using errcode = 'P0001';
    end if;
    return v_existing.id;
  end if;
  insert into public.affidavit_stage (
    row_key, constituency_id, person_name, person_key, party_name, person_slug,
    election, year, assets_inr, liabilities_inr, declared_cases, serious_cases,
    source_url, page_number, file_key, status, created_by
  ) values (
    v_key, v_constituency, v_name, public.app_name_key(v_name), v_party, v_slug,
    v_election, p_year, p_assets_inr, p_liabilities_inr, p_declared_cases, p_serious_cases,
    v_url, p_page_number, v_file, 'staged', v_staff.user_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_confirm_affidavit(
  p_stage_id uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_row public.affidavit_stage;
  v_person_id uuid;
  v_person_slug text;
  v_matches integer;
  v_source_id uuid;
  v_affidavit uuid;
  v_change_written boolean := false;
  v_other_id uuid;
  v_other public.affidavits;
  v_earlier public.affidavits;
  v_later public.affidavits;
  v_assets_delta bigint;
  v_liabilities_delta bigint;
  v_declared_delta integer;
  v_serious_delta integer;
  v_parts text[] := array[]::text[];
  v_formula text;
  v_inserted integer;
begin
  v_staff := public.app_staff(array['editor', 'reviewer', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  select * into v_row from public.affidavit_stage where id = p_stage_id;
  if not found then
    raise exception 'record not found' using errcode = 'P0001';
  end if;
  if v_row.created_by = v_staff.user_id then
    raise exception 'self-approval' using errcode = 'P0001';
  end if;
  perform public.app_assert_silence(array[v_row.constituency_id]);
  if v_row.status = 'confirmed' and v_row.affidavit_id is not null then
    select p.slug into v_person_slug
    from public.affidavits a
    left join public.people p on p.id = a.person_id
    where a.id = v_row.affidavit_id;
    return jsonb_build_object(
      'wrote', false,
      'change_written', false,
      'person_slug', v_person_slug,
      'constituency_id', v_row.constituency_id,
      'affidavit_id', v_row.affidavit_id
    );
  end if;
  if v_row.source_url is null or btrim(v_row.source_url) = '' or left(btrim(v_row.source_url), 8) <> 'https://' then
    raise exception 'tier-1 source requires a url' using errcode = '23514';
  end if;
  if v_row.page_number is null or v_row.page_number < 1 then
    raise exception 'page number required' using errcode = 'P0001';
  end if;
  perform public.app_reject_personal(v_row.person_name);
  perform public.app_reject_personal(v_row.party_name);
  perform public.app_reject_personal(v_row.election);

  v_person_id := null;
  v_person_slug := null;
  if v_row.person_slug is not null then
    select p.id, p.slug into v_person_id, v_person_slug
    from public.people p
    where p.slug = v_row.person_slug
      and p.constituency_id = v_row.constituency_id;
    if not found then
      v_person_id := null;
      v_person_slug := null;
    end if;
  end if;
  if v_person_id is null then
    select count(*) into v_matches
    from public.people p
    where p.constituency_id = v_row.constituency_id
      and public.app_name_key(p.name) = v_row.person_key;
    if v_matches = 1 then
      select p.id, p.slug into v_person_id, v_person_slug
      from public.people p
      where p.constituency_id = v_row.constituency_id
        and public.app_name_key(p.name) = v_row.person_key;
    end if;
  end if;

  select id into v_source_id
  from public.sources
  where type = 'ECI' and url = v_row.source_url
  order by created_at
  limit 1;
  if v_source_id is null then
    insert into public.sources (type, url, title, publisher, created_by)
    values (
      'ECI',
      v_row.source_url,
      v_row.election || ' ' || v_row.year::text || ' affidavit',
      'Election Commission of India',
      v_staff.user_id
    )
    returning id into v_source_id;
  end if;
  perform public.app_assert_source(v_source_id);

  insert into public.affidavits (
    person_id, constituency_id, election, year, assets_inr, liabilities_inr,
    declared_cases, serious_cases, source_id, page_number, person_key, file_key
  ) values (
    v_person_id, v_row.constituency_id, v_row.election, v_row.year, v_row.assets_inr,
    v_row.liabilities_inr, v_row.declared_cases, v_row.serious_cases, v_source_id,
    v_row.page_number, v_row.person_key, v_row.file_key
  )
  returning id into v_affidavit;

  update public.affidavit_stage
  set status = 'confirmed',
      confirmed_by = v_staff.user_id,
      affidavit_id = v_affidavit
  where id = v_row.id;

  for v_other_id in
    select a.id
    from public.affidavits a
    join public.affidavit_stage s on s.affidavit_id = a.id
    where s.status = 'confirmed'
      and s.file_key = v_row.file_key
      and s.constituency_id = v_row.constituency_id
      and s.person_key = v_row.person_key
      and a.id <> v_affidavit
      and a.year <> v_row.year
      and a.page_number is not null
  loop
    select * into v_other from public.affidavits where id = v_other_id;
    if v_other.year < v_row.year then
      v_earlier := v_other;
      select * into v_later from public.affidavits where id = v_affidavit;
    else
      select * into v_earlier from public.affidavits where id = v_affidavit;
      v_later := v_other;
    end if;
    v_assets_delta := case
      when v_earlier.assets_inr is not null and v_later.assets_inr is not null
      then v_later.assets_inr - v_earlier.assets_inr
      else null
    end;
    v_liabilities_delta := case
      when v_earlier.liabilities_inr is not null and v_later.liabilities_inr is not null
      then v_later.liabilities_inr - v_earlier.liabilities_inr
      else null
    end;
    v_declared_delta := case
      when v_earlier.declared_cases is not null and v_later.declared_cases is not null
      then v_later.declared_cases - v_earlier.declared_cases
      else null
    end;
    v_serious_delta := case
      when v_earlier.serious_cases is not null and v_later.serious_cases is not null
      then v_later.serious_cases - v_earlier.serious_cases
      else null
    end;
    v_parts := array[]::text[];
    if v_assets_delta is not null then
      v_parts := v_parts || format(
        '%s assets - %s assets = %s',
        v_later.year, v_earlier.year, v_assets_delta
      );
    end if;
    if v_liabilities_delta is not null then
      v_parts := v_parts || format(
        '%s liabilities - %s liabilities = %s',
        v_later.year, v_earlier.year, v_liabilities_delta
      );
    end if;
    if v_declared_delta is not null then
      v_parts := v_parts || format(
        '%s declared cases - %s declared cases = %s',
        v_later.year, v_earlier.year, v_declared_delta
      );
    end if;
    if v_serious_delta is not null then
      v_parts := v_parts || format(
        '%s serious cases - %s serious cases = %s',
        v_later.year, v_earlier.year, v_serious_delta
      );
    end if;
    if cardinality(v_parts) = 0 then
      continue;
    end if;
    v_formula := array_to_string(v_parts, '; ');
    insert into public.affidavit_changes (
      person_id, constituency_id, earlier_affidavit_id, later_affidavit_id, file_key,
      assets_earlier_inr, assets_later_inr, assets_delta_inr,
      liabilities_earlier_inr, liabilities_later_inr, liabilities_delta_inr,
      declared_cases_earlier, declared_cases_later, declared_cases_delta,
      serious_cases_earlier, serious_cases_later, serious_cases_delta,
      formula, label
    ) values (
      coalesce(v_later.person_id, v_earlier.person_id),
      v_row.constituency_id,
      v_earlier.id,
      v_later.id,
      v_row.file_key,
      v_earlier.assets_inr, v_later.assets_inr, v_assets_delta,
      v_earlier.liabilities_inr, v_later.liabilities_inr, v_liabilities_delta,
      v_earlier.declared_cases, v_later.declared_cases, v_declared_delta,
      v_earlier.serious_cases, v_later.serious_cases, v_serious_delta,
      v_formula,
      'Calculated by Praja Ledger'
    )
    on conflict (earlier_affidavit_id, later_affidavit_id) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted > 0 then
      v_change_written := true;
    end if;
  end loop;

  return jsonb_build_object(
    'wrote', true,
    'change_written', v_change_written,
    'person_slug', v_person_slug,
    'constituency_id', v_row.constituency_id,
    'affidavit_id', v_affidavit
  );
end;
$$;

revoke all on function public.app_name_key(text) from public, anon, authenticated, service_role;
revoke all on function public.app_reject_personal(text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_set_constituency_reservation(text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_stage_affidavit(text, text, text, text, text, integer, bigint, bigint, integer, integer, text, integer, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_confirm_affidavit(uuid, text) from public, anon, authenticated, service_role;

grant execute on function public.rpc_set_constituency_reservation(text, text, text) to authenticated;
grant execute on function public.rpc_stage_affidavit(text, text, text, text, text, integer, bigint, bigint, integer, integer, text, integer, text, text) to authenticated;
grant execute on function public.rpc_confirm_affidavit(uuid, text) to authenticated;

create or replace view public.v_constituencies
with (security_barrier = true) as
select id, kind, number, name, name_te, district, reservation_category
from public.constituencies;

create or replace view public.v_affidavits
with (security_barrier = true) as
select
  a.id,
  a.person_id,
  p.slug as person_slug,
  a.constituency_id,
  a.election,
  a.year,
  a.assets_inr,
  a.liabilities_inr,
  a.declared_cases,
  a.serious_cases,
  a.page_number,
  s.url as source_url,
  s.title as source_title,
  s.publisher,
  s.published_on
from public.affidavits a
join public.sources s on s.id = a.source_id
left join public.people p on p.id = a.person_id
where a.page_number is not null
  and a.page_number >= 1
  and a.constituency_id is not null
  and s.type = 'ECI'
  and nullif(btrim(s.url), '') is not null;

create or replace view public.v_affidavit_changes
with (security_barrier = true) as
select
  c.id,
  c.person_id,
  p.slug as person_slug,
  c.constituency_id,
  c.earlier_affidavit_id,
  c.later_affidavit_id,
  e.year as earlier_year,
  l.year as later_year,
  c.assets_earlier_inr,
  c.assets_later_inr,
  c.assets_delta_inr,
  c.liabilities_earlier_inr,
  c.liabilities_later_inr,
  c.liabilities_delta_inr,
  c.declared_cases_earlier,
  c.declared_cases_later,
  c.declared_cases_delta,
  c.serious_cases_earlier,
  c.serious_cases_later,
  c.serious_cases_delta,
  c.formula,
  c.label
from public.affidavit_changes c
join public.affidavits e on e.id = c.earlier_affidavit_id
join public.affidavits l on l.id = c.later_affidavit_id
left join public.people p on p.id = c.person_id
where c.label = 'Calculated by Praja Ledger'
  and e.page_number is not null
  and l.page_number is not null;

create or replace view public.v_editor_affidavit_stage
with (security_barrier = true, security_invoker = false) as
select
  id,
  constituency_id,
  person_name,
  party_name,
  election,
  year,
  assets_inr,
  liabilities_inr,
  declared_cases,
  serious_cases,
  source_url,
  page_number,
  status,
  created_by,
  file_key
from public.affidavit_stage
where status = 'staged'
  and exists (select 1 from public.staff s where s.user_id = auth.uid());

comment on view public.v_editor_affidavit_stage is
  'Staged affidavits for confirmation. Personal details are not columns.';

grant select on public.v_affidavits, public.v_affidavit_changes to anon, authenticated;

revoke all on public.v_editor_affidavit_stage from public, anon, authenticated;
grant select on public.v_editor_affidavit_stage to authenticated;

alter table public.affidavit_stage enable row level security;
alter table public.affidavit_changes enable row level security;
revoke all on table public.affidavit_stage from public, anon, authenticated;
revoke all on table public.affidavit_changes from public, anon, authenticated;

create trigger audit_affidavit_stage
after insert or update or delete on public.affidavit_stage
for each row execute function public.audit_if_reason();

create trigger audit_affidavit_changes
after insert or update or delete on public.affidavit_changes
for each row execute function public.audit_if_reason();

create or replace function public.prevent_affidavit_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'published content cannot be deleted' using errcode = 'P0001';
end;
$$;

create trigger affidavits_no_delete
before delete on public.affidavits
for each row execute function public.prevent_affidavit_delete();

create trigger affidavit_changes_no_delete
before delete on public.affidavit_changes
for each row execute function public.prevent_affidavit_delete();
