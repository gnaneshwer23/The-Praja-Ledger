-- Phase 5: public corrections, right of reply, and contact-email removal.
-- Public forms call these functions only after the route handler checks Turnstile.
-- anon and authenticated cannot execute the submit functions, so a public key cannot skip that check.

alter table public.corrections
  add column if not exists fix_audit_id bigint references public.audit_log (id);

alter table public.corrections
  drop constraint if exists corrections_fix_link;

alter table public.corrections
  add constraint corrections_fix_link check (
    status <> 'applied' or fix_audit_id is not null
  );

alter table public.replies
  add column if not exists office_email text,
  add column if not exists verification_method text,
  add column if not exists letter_path text,
  add column if not exists letter_sha256 text;

alter table public.replies
  drop constraint if exists replies_verification_method;

alter table public.replies
  add constraint replies_verification_method check (
    verification_method is null or verification_method in ('email_domain', 'signed_letter')
  );

alter table public.replies
  drop constraint if exists replies_verified_before_publish;

alter table public.replies
  add constraint replies_verified_before_publish check (
    status is distinct from 'published' or (
      verified_by is not null and verification_method is not null
    )
  );

comment on column public.replies.office_email is 'Never published. Used only to check the office domain.';
comment on column public.corrections.contact_email is 'Never published. Nulled 90 days after a decision.';

create table if not exists public.submission_attempts (
  id bigserial primary key,
  form_kind text not null check (form_kind in ('correction', 'reply')),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index if not exists submission_attempts_lookup
  on public.submission_attempts (form_kind, ip_hash, created_at desc);

comment on table public.submission_attempts is
  'Salted IP hashes for the public form rate limit. The address itself is not stored.';

-- Drop contact addresses out of the audit payload. The log stays append-only.
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

  if v_before is not null then
    v_before := v_before - 'contact_email' - 'office_email';
  end if;
  if v_after is not null then
    v_after := v_after - 'contact_email' - 'office_email';
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

create or replace function public.replies_keep_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.body is distinct from old.body
    or new.office_name is distinct from old.office_name
    or new.office_email is distinct from old.office_email
  then
    raise exception 'reply is published unedited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists replies_keep_text on public.replies;
create trigger replies_keep_text
before update on public.replies
for each row execute function public.replies_keep_text();

create or replace function public.prevent_reply_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'published' then
    raise exception 'published content cannot be deleted' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists replies_no_published_delete on public.replies;
create trigger replies_no_published_delete
before delete on public.replies
for each row execute function public.prevent_reply_delete();

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'audit_submission_attempts') then
    create trigger audit_submission_attempts
    after insert or update or delete on public.submission_attempts
    for each row execute function public.audit_if_reason();
  end if;
end;
$$;

alter table public.submission_attempts enable row level security;
revoke all on public.submission_attempts from public, anon, authenticated;
revoke all on sequence public.submission_attempts_id_seq from public, anon, authenticated;

create or replace function public.app_require_owner()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner name;
begin
  select r.rolname into v_owner
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_roles r on r.oid = c.relowner
  where n.nspname = 'public' and c.relname = 'corrections';
  if session_user::name is distinct from v_owner then
    raise exception 'forbidden role' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.app_resolve_public_record(p_entity_type text, p_public_id text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_key text := btrim(coalesce(p_public_id, ''));
begin
  if p_entity_type = 'entry' then
    select e.id into v_id
    from public.entries e
    where e.status = 'published'
      and (e.id::text = v_key or e.external_id = v_key);
  elsif p_entity_type = 'case' then
    select c.id into v_id
    from public.cases c
    where (c.id::text = v_key or c.slug = v_key)
      and exists (
        select 1 from public.case_events ev
        where ev.case_id = c.id and ev.status = 'published'
      );
  elsif p_entity_type = 'promise' then
    select p.id into v_id
    from public.promises p
    where (p.id::text = v_key or p.external_id = v_key)
      and exists (select 1 from public.promise_updates u where u.promise_id = p.id);
  else
    raise exception 'record not found' using errcode = 'P0001';
  end if;
  if v_id is null then
    raise exception 'record not found' using errcode = 'P0001';
  end if;
  return v_id;
end;
$$;

create or replace function public.app_rate_limit(p_form_kind text, p_ip_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'ip hash required' using errcode = 'P0001';
  end if;
  if (
    select count(*)
    from public.submission_attempts
    where form_kind = p_form_kind
      and ip_hash = p_ip_hash
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate limit' using errcode = 'P0001';
  end if;
  insert into public.submission_attempts (form_kind, ip_hash)
  values (p_form_kind, p_ip_hash);
end;
$$;

create or replace function public.rpc_submit_correction(
  p_entity_type text,
  p_public_id text,
  p_body text,
  p_source_url text,
  p_contact_email text,
  p_ip_hash text,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_entity uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_url text := nullif(btrim(coalesce(p_source_url, '')), '');
  v_email text := nullif(btrim(coalesce(p_contact_email, '')), '');
begin
  perform public.app_require_owner();
  perform public.app_require_reason(p_reason);
  if v_body = '' then
    raise exception 'reason required' using errcode = 'P0001';
  end if;
  if v_url is not null and v_url !~ '^https://' then
    raise exception 'https url required' using errcode = 'P0001';
  end if;
  if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'email refused' using errcode = 'P0001';
  end if;
  perform public.app_rate_limit('correction', p_ip_hash);
  if (select count(*) from public.corrections where status = 'open') >= 2000 then
    raise exception 'correction queue full' using errcode = 'P0001';
  end if;
  v_entity := public.app_resolve_public_record(p_entity_type, p_public_id);
  insert into public.corrections (entity_type, entity_id, body, source_url, contact_email, status)
  values (p_entity_type, v_entity, v_body, v_url, v_email, 'open')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_apply_correction(
  p_id uuid,
  p_fix_audit_id bigint,
  p_note text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_note text := btrim(coalesce(p_note, ''));
begin
  v_staff := public.app_staff(array['reviewer', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if v_note = '' then
    raise exception 'reason required' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.audit_log where id = p_fix_audit_id) then
    raise exception 'record not found' using errcode = 'P0001';
  end if;
  update public.corrections
  set status = 'applied',
      fix_audit_id = p_fix_audit_id,
      decision_note = v_note,
      decided_by = v_staff.user_id,
      decided_at = now()
  where id = p_id and status = 'open';
  if not found then
    raise exception 'not pending' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.rpc_decline_correction(
  p_id uuid,
  p_note text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_note text := btrim(coalesce(p_note, ''));
begin
  v_staff := public.app_staff(array['reviewer', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  if v_note = '' then
    raise exception 'reason required' using errcode = 'P0001';
  end if;
  update public.corrections
  set status = 'declined',
      decision_note = v_note,
      decided_by = v_staff.user_id,
      decided_at = now()
  where id = p_id and status = 'open';
  if not found then
    raise exception 'not pending' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.rpc_submit_reply(
  p_public_id text,
  p_office_name text,
  p_body text,
  p_office_email text,
  p_ip_hash text,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_entry uuid;
  v_name text := btrim(coalesce(p_office_name, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_email text := nullif(btrim(coalesce(p_office_email, '')), '');
begin
  perform public.app_require_owner();
  perform public.app_require_reason(p_reason);
  if v_name = '' or v_body = '' then
    raise exception 'reason required' using errcode = 'P0001';
  end if;
  if position('@' in v_name) > 0 or position('@' in v_body) > 0
    or v_name ~ '[0-9]{10}' or v_body ~ '[0-9]{10}'
  then
    raise exception 'personal data refused' using errcode = 'P0001';
  end if;
  if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'email refused' using errcode = 'P0001';
  end if;
  perform public.app_rate_limit('reply', p_ip_hash);
  v_entry := public.app_resolve_public_record('entry', p_public_id);
  insert into public.replies (entry_id, office_name, body, office_email, status)
  values (v_entry, v_name, v_body, v_email, 'pending_review')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_publish_reply(
  p_reply_id uuid,
  p_method text,
  p_letter_path text,
  p_letter_sha256 text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_reply public.replies;
  v_domain text;
  v_path text := nullif(btrim(coalesce(p_letter_path, '')), '');
  v_sha text := nullif(btrim(coalesce(p_letter_sha256, '')), '');
  v_result jsonb;
begin
  v_staff := public.app_staff(array['reviewer', 'admin']::public.staff_role[]);
  perform public.app_require_reason(p_reason);
  select * into v_reply from public.replies where id = p_reply_id;
  if not found or v_reply.status <> 'pending_review' then
    raise exception 'not pending' using errcode = 'P0001';
  end if;
  if p_method = 'email_domain' then
    v_domain := lower(split_part(coalesce(v_reply.office_email, ''), '@', 2));
    if v_domain = '' or v_domain = any (array[
      'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'hotmail.com',
      'outlook.com', 'live.com', 'rediffmail.com', 'icloud.com', 'proton.me', 'protonmail.com'
    ]) then
      raise exception 'office domain refused' using errcode = 'P0001';
    end if;
    v_path := null;
    v_sha := null;
  els  if p_method = 'signed_letter' then
    if v_sha !~ '^[0-9a-f]{64}$'
      or v_path is null
      or v_path not in (
        'replies/' || v_sha || '.pdf',
        'replies/' || v_sha || '.png',
        'replies/' || v_sha || '.jpg'
      )
    then
      raise exception 'signed letter required' using errcode = 'P0001';
    end if;
  else
    raise exception 'signed letter required' using errcode = 'P0001';
  end if;

  update public.replies
  set status = 'published',
      verified_by = v_staff.user_id,
      verification_method = p_method,
      letter_path = v_path,
      letter_sha256 = v_sha
  where id = p_reply_id;

  select jsonb_build_object(
    'person_slug', p.slug,
    'constituency_id', p.constituency_id,
    'section', e.section,
    'external_id', e.external_id
  ) into v_result
  from public.entries e
  join public.people p on p.id = e.person_id
  where e.id = v_reply.entry_id;
  return coalesce(v_result, '{}'::jsonb);
end;
$$;

create or replace function public.rpc_purge_correction_emails(p_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner name;
  v_count integer;
begin
  perform public.app_require_reason(p_reason);
  if auth.uid() is null then
    select r.rolname into v_owner
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_roles r on r.oid = c.relowner
    where n.nspname = 'public' and c.relname = 'corrections';
    if session_user::name is distinct from v_owner then
      raise exception 'forbidden role' using errcode = '42501';
    end if;
  else
    perform public.app_staff(array['admin']::public.staff_role[]);
  end if;
  update public.corrections
  set contact_email = null
  where contact_email is not null
    and status in ('applied', 'declined')
    and decided_at is not null
    and decided_at <= now() - interval '90 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.app_require_owner() from public, anon, authenticated, service_role;
revoke all on function public.app_resolve_public_record(text, text) from public, anon, authenticated, service_role;
revoke all on function public.app_rate_limit(text, text) from public, anon, authenticated, service_role;
revoke all on function public.replies_keep_text() from public, anon, authenticated, service_role;
revoke all on function public.prevent_reply_delete() from public, anon, authenticated, service_role;

revoke all on function public.rpc_submit_correction(text, text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.rpc_submit_reply(text, text, text, text, text, text)
  from public, anon, authenticated, service_role;

revoke all on function public.rpc_apply_correction(uuid, bigint, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.rpc_decline_correction(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.rpc_publish_reply(uuid, text, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.rpc_purge_correction_emails(text)
  from public, anon, authenticated, service_role;

grant execute on function public.rpc_apply_correction(uuid, bigint, text, text) to authenticated;
grant execute on function public.rpc_decline_correction(uuid, text, text) to authenticated;
grant execute on function public.rpc_publish_reply(uuid, text, text, text, text) to authenticated;
grant execute on function public.rpc_purge_correction_emails(text) to authenticated;

create or replace view public.v_replies
with (security_barrier = true) as
select
  r.id,
  e.external_id,
  r.office_name,
  r.body,
  r.created_at
from public.replies r
join public.entries e on e.id = r.entry_id
where r.status = 'published'
  and e.status = 'published';

comment on view public.v_replies is 'Published replies. Office email is not selected.';

create or replace view public.v_editor_corrections
with (security_barrier = true, security_invoker = false) as
select
  c.id,
  c.entity_type,
  c.entity_id,
  c.body,
  c.source_url,
  c.status,
  c.created_at
from public.corrections c
where c.status = 'open'
  and exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.role in ('reviewer', 'admin')
  );

comment on view public.v_editor_corrections is 'Open corrections for triage. Contact email is not selected.';

create or replace view public.v_editor_replies
with (security_barrier = true, security_invoker = false) as
select
  r.id,
  r.entry_id,
  e.external_id,
  e.title,
  r.office_name,
  r.body,
  r.created_at,
  (r.office_email is not null) as has_office_email,
  nullif(split_part(r.office_email, '@', 2), '') as office_domain
from public.replies r
join public.entries e on e.id = r.entry_id
where r.status = 'pending_review'
  and exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.role in ('reviewer', 'admin')
  );

comment on view public.v_editor_replies is 'Pending replies. The office address is not selected, only its domain.';

create or replace view public.v_editor_changes
with (security_barrier = true, security_invoker = false) as
select id, at, actor_name, table_name, action, reason
from (
  select a.id, a.at, a.actor_name, a.table_name, a.action, a.reason
  from public.audit_log a
  where exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.role in ('reviewer', 'admin')
  )
  order by a.id desc
  limit 40
) recent;

comment on view public.v_editor_changes is 'Recent change ids for correction triage. Row payloads are not selected.';

revoke all on public.v_replies from public;
grant select on public.v_replies to anon, authenticated;

revoke all on public.v_editor_corrections, public.v_editor_replies, public.v_editor_changes
  from public, anon;
grant select on public.v_editor_corrections, public.v_editor_replies, public.v_editor_changes
  to authenticated;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('replies', 'replies', false)
    on conflict (id) do nothing;
  end if;
exception
  when others then
    null;
end;
$$;
