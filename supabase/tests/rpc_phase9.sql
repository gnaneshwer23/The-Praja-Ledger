-- SQL tests for the phase 9 public silence view and a publish refusal.
-- Run with: supabase test db
-- Each file is one transaction. Fixtures roll back.
-- Do not run this against the compiled edition unless the runner rolls back.

begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(8);

create or replace function public._as_user(p_uid uuid, p_sql text)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
    true
  );
  execute p_sql;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
exception
  when others then
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '{}', true);
    raise;
end;
$$;

select set_config('app.reason', 'Phase 9 fixture', true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '9a111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'phase9-editor@example.com',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

insert into public.staff (user_id, role, display_name)
values ('9a111111-1111-4111-8111-111111111111', 'editor', 'Phase 9 editor');

insert into public.constituencies (id, kind, number, name)
values ('p9-seat', 'AC', 901, 'Phase 9 seat');

insert into public.people (id, slug, name, constituency_id)
values (
  '9a555555-5555-4555-8555-555555555555',
  'phase9-person',
  'Phase 9 person',
  'p9-seat'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'v_live_silence'
      and column_name = 'note'
  ),
  'v_live_silence hides the staff note'
);

select set_config('app.reason', 'Phase 9 future window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['p9-future'], now() + interval '2 hours', now() + interval '4 hours', 'Phase 9 future');

select set_config('app.reason', 'Phase 9 past window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['p9-past'], now() - interval '4 hours', now() - interval '1 hour', 'Phase 9 past');

select is(
  (
    select count(*)
    from public.v_live_silence
    where 'p9-future' = any (constituency_ids)
      or 'p9-past' = any (constituency_ids)
  ),
  0::bigint,
  'v_live_silence hides windows that are not open'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '9a111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_source('MEDIA'::public.source_type, 'https://example.com/phase9-source', 'Phase 9 source', 'Example paper', '2026-10-26'::date, 'Source before the window')$$
  ),
  'rpc_save_source allowed role before a silence window'
);

select set_config('app.reason', 'Phase 9 live window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['p9-seat'], now() - interval '1 hour', now() + interval '48 hours', 'Phase 9 live');

select is(
  (select count(*) from public.v_live_silence where 'p9-seat' = any (constituency_ids)),
  1::bigint,
  'v_live_silence shows an open window'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '9a111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_entry('9a555555-5555-4555-8555-555555555555', 'work'::public.entry_kind, 'Phase 9 silenced entry', null, (select id from public.sources where title = 'Phase 9 source'), 'Entry during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_save_entry inside silence window'
);

select is(
  (select count(*) from public.entries where body = 'Phase 9 silenced entry'),
  0::bigint,
  'rpc_save_entry inside silence window leaves no row'
);

set role anon;
select lives_ok(
  $$select id, constituency_ids, starts_at, ends_at from public.v_live_silence$$,
  'anon can read live silence windows'
);
select throws_ok(
  $$select note from public.silence_windows$$,
  '42501',
  'permission denied for table silence_windows',
  'anon cannot read silence windows'
);
reset role;

select * from finish();
rollback;
