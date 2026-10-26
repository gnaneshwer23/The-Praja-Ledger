-- Phase 6. Nightly hash chain for the public register.
-- The snapshot file is the public views only. Contact emails are not selected.

create unique index if not exists snapshots_storage_path_key
  on public.snapshots (storage_path);

create or replace function public.rpc_record_snapshot(
  p_storage_path text,
  p_sha256 text,
  p_reason text
) returns public.snapshots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text := btrim(coalesce(p_storage_path, ''));
  v_hash text := lower(btrim(coalesce(p_sha256, '')));
  v_day date;
  v_prev text;
  v_row public.snapshots;
begin
  perform public.app_require_owner();
  perform public.app_require_reason(p_reason);
  if v_path !~ '^snapshots/[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$' then
    raise exception 'snapshot path refused' using errcode = 'P0001';
  end if;
  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'snapshot hash refused' using errcode = 'P0001';
  end if;
  begin
    v_day := to_date(substring(v_path from 11 for 10), 'YYYY-MM-DD');
  exception
    when datetime_field_overflow or invalid_datetime_format then
      raise exception 'snapshot path refused' using errcode = 'P0001';
  end;
  if to_char(v_day, 'YYYY-MM-DD') is distinct from substring(v_path from 11 for 10) then
    raise exception 'snapshot path refused' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.snapshots where storage_path = v_path) then
    raise exception 'snapshot exists' using errcode = 'P0001';
  end if;

  select s.sha256 into v_prev
  from public.snapshots s
  order by s.id desc
  limit 1;

  insert into public.snapshots (storage_path, sha256, prev_sha256)
  values (v_path, v_hash, v_prev)
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.rpc_record_snapshot(text, text, text)
  from public, anon, authenticated, service_role;

comment on function public.rpc_record_snapshot(text, text, text) is
  'Owner records one public snapshot hash and the previous snapshot hash. A silence window does not block it.';

create or replace view public.v_snapshots
with (security_barrier = true) as
select id, taken_at, storage_path, sha256, prev_sha256
from public.snapshots;

comment on view public.v_snapshots is
  'Published snapshot hashes. File bytes stay in storage.';

revoke all on public.v_snapshots from public;
grant select on public.v_snapshots to anon, authenticated;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('snapshots', 'snapshots', false)
    on conflict (id) do nothing;
  end if;
exception
  when others then
    null;
end;
$$;
