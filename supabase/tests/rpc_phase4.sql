-- SQL tests for the phase 4 editor functions.
-- Run with: supabase test db
-- Each file is one transaction. Fixtures roll back.

begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(47);

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

create or replace function public._as_user_bigint(p_uid uuid, p_sql text)
returns bigint
language plpgsql
as $$
declare
  v_result bigint;
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
    true
  );
  execute p_sql into v_result;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  return v_result;
exception
  when others then
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '{}', true);
    raise;
end;
$$;

select set_config('app.reason', 'Phase 4 test fixture', true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'editor-p4@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'reviewer-p4@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'admin-p4@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'outsider-p4@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '12121212-1212-4212-8212-121212121212', 'authenticated', 'authenticated', 'new-staff-p4@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into public.staff (user_id, role, display_name) values
  ('11111111-1111-4111-8111-111111111111', 'editor', 'Editor'),
  ('22222222-2222-4222-8222-222222222222', 'reviewer', 'Reviewer'),
  ('33333333-3333-4333-8333-333333333333', 'admin', 'Admin');

insert into public.constituencies (id, kind, number, name) values
  ('p4-open', 'AC', 99, 'Phase 4 open seat');
insert into public.people (id, slug, name, constituency_id) values
  ('55555555-5555-4555-8555-555555555555', 'phase4-person', 'Phase 4 person', 'p4-open');
insert into public.cases (id, slug, title) values
  ('77777777-7777-4777-8777-777777777777', 'phase4-case', 'Phase 4 case');

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_source('MEDIA'::public.source_type, 'https://example.com/phase4-source', 'Phase 4 source', 'Example paper', '2026-10-25'::date, 'Phase 4 source save')$$
  ),
  'phase 4 fixture source'
);

-- rpc_record_source_archive
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_record_source_archive((select id from public.sources where title = 'Phase 4 source'), 'sources/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.html', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'Archive the phase 4 source')$$
  ),
  'rpc_record_source_archive allowed role'
);
select is(
  (select sha256 from public.sources where title = 'Phase 4 source'),
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'rpc_record_source_archive stores the hash'
);
select ok(
  exists (
    select 1 from public.audit_log
    where table_name = 'sources' and reason = 'Archive the phase 4 source'
  ),
  'rpc_record_source_archive writes the reason to audit_log'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_record_source_archive((select id from public.sources where title = 'Phase 4 source'), 'sources/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.html', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Reviewer archive')$$
  ),
  '42501',
  'forbidden role',
  'rpc_record_source_archive forbidden role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_record_source_archive((select id from public.sources where title = 'Phase 4 source'), 'sources/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.html', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', '')$$
  ),
  'P0001',
  'reason required',
  'rpc_record_source_archive missing reason'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_record_source_archive((select id from public.sources where title = 'Phase 4 source'), 'sources/not-a-hash.html', 'not-a-hash', 'Bad archive hash')$$
  ),
  'P0001',
  'invalid archive hash',
  'rpc_record_source_archive invalid hash'
);

select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['p4-open'], now() - interval '1 hour', now() + interval '1 hour', 'phase 4 silence');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_record_source_archive((select id from public.sources where title = 'Phase 4 source'), 'sources/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd.html', 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', 'Archive during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_record_source_archive inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'phase 4 silence';

-- rpc_send_back
select set_config('app.reason', 'Pending entry fixture', true);
insert into public.entries (id, person_id, kind, body, source_id, status, created_by)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '55555555-5555-4555-8555-555555555555',
  'issue',
  'Pending phase 4 issue',
  (select id from public.sources where title = 'Phase 4 source'),
  'pending_review',
  '11111111-1111-4111-8111-111111111111'
);
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_send_back('entry', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Send the issue back')$$
  ),
  'rpc_send_back allowed role'
);
select is(
  (select status::text from public.entries where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'draft',
  'rpc_send_back sets the entry to draft'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_send_back('entry', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Editor send back')$$
  ),
  '42501',
  'forbidden role',
  'rpc_send_back forbidden role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_send_back('entry', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '')$$
  ),
  'P0001',
  'reason required',
  'rpc_send_back missing reason'
);

select set_config('app.reason', 'Own pending entry', true);
insert into public.entries (id, person_id, kind, body, source_id, status, created_by)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  '55555555-5555-4555-8555-555555555555',
  'issue',
  'Reviewer own issue',
  (select id from public.sources where title = 'Phase 4 source'),
  'pending_review',
  '22222222-2222-4222-8222-222222222222'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_send_back('entry', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Send my own item back')$$
  ),
  'P0001',
  'self-approval',
  'rpc_send_back self-approval'
);
select is(
  (select status::text from public.entries where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
  'pending_review',
  'rpc_send_back self-approval leaves the row pending'
);

-- rpc_set_staff and rpc_remove_staff
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_set_staff('12121212-1212-4212-8212-121212121212', 'editor'::public.staff_role, 'New editor', 'Add a staff role')$$
  ),
  'rpc_set_staff allowed role'
);
select is(
  (select role::text from public.staff where user_id = '12121212-1212-4212-8212-121212121212'),
  'editor',
  'rpc_set_staff writes the role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_set_staff('12121212-1212-4212-8212-121212121212', 'reviewer'::public.staff_role, 'New editor', 'Editor changes a role')$$
  ),
  '42501',
  'forbidden role',
  'rpc_set_staff forbidden role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_set_staff('12121212-1212-4212-8212-121212121212', 'reviewer'::public.staff_role, 'New editor', '')$$
  ),
  'P0001',
  'reason required',
  'rpc_set_staff missing reason'
);
select is(
  (select role::text from public.staff where user_id = '12121212-1212-4212-8212-121212121212'),
  'editor',
  'rpc_set_staff missing reason leaves the role unchanged'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_set_staff('33333333-3333-4333-8333-333333333333', 'editor'::public.staff_role, 'Admin', 'Change my own role')$$
  ),
  'P0001',
  'cannot change own role',
  'rpc_set_staff cannot change own role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_set_staff('12121212-1212-4212-8212-121212121212', 'editor'::public.staff_role, 'editor@example.com', 'Name with an email')$$
  ),
  'P0001',
  'personal data refused',
  'rpc_set_staff refuses an email in the display name'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_remove_staff('12121212-1212-4212-8212-121212121212', 'Remove a staff role')$$
  ),
  'rpc_remove_staff allowed role'
);
select is(
  (select count(*) from public.staff where user_id = '12121212-1212-4212-8212-121212121212'),
  0::bigint,
  'rpc_remove_staff removes the staff row'
);
select ok(
  (select count(*) from public.audit_log where reason = 'Remove a staff role') >= 1,
  'rpc_remove_staff appends an audit row'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_remove_staff('22222222-2222-4222-8222-222222222222', 'Editor removes staff')$$
  ),
  '42501',
  'forbidden role',
  'rpc_remove_staff forbidden role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_remove_staff('22222222-2222-4222-8222-222222222222', '')$$
  ),
  'P0001',
  'reason required',
  'rpc_remove_staff missing reason'
);
select is(
  (select count(*) from public.staff where user_id = '22222222-2222-4222-8222-222222222222'),
  1::bigint,
  'rpc_remove_staff missing reason leaves the row'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_remove_staff('33333333-3333-4333-8333-333333333333', 'Remove myself')$$
  ),
  'P0001',
  'cannot remove self',
  'rpc_remove_staff cannot remove self'
);

-- rpc_save_party
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_save_party('p4-sample', 'Phase 4 sample', null, 'Save sample party')$$
  ),
  'rpc_save_party allowed role'
);
select is(
  (select actor_name from public.audit_log where reason = 'Save sample party' order by id desc limit 1),
  'Admin',
  'rpc_save_party records the display name and the reason'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_save_party('p4-forbidden', 'Forbidden party', null, 'Reviewer saves a party')$$
  ),
  '42501',
  'forbidden role',
  'rpc_save_party forbidden role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_save_party('p4-missing', 'Missing reason party', null, '')$$
  ),
  'P0001',
  'reason required',
  'rpc_save_party missing reason'
);
select is(
  (select count(*) from public.parties where id = 'p4-missing'),
  0::bigint,
  'rpc_save_party missing reason leaves no row'
);

select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['p4-open'], now() - interval '1 hour', now() + interval '1 hour', 'phase 4 silence');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_save_party('p4-silenced', 'Silenced party', null, 'Party during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_save_party inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'phase 4 silence';

-- rpc_save_constituency
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_save_constituency('p4-seat', 'AC', 98, 'Phase 4 seat', null, null, 'Save a constituency')$$
  ),
  'rpc_save_constituency allowed role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_save_constituency('p4-seat-no', 'AC', 97, 'Forbidden seat', null, null, 'Reviewer saves a seat')$$
  ),
  '42501',
  'forbidden role',
  'rpc_save_constituency forbidden role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_save_constituency('p4-seat-blank', 'AC', 96, 'Blank reason seat', null, null, '')$$
  ),
  'P0001',
  'reason required',
  'rpc_save_constituency missing reason'
);
select is(
  (select count(*) from public.constituencies where id = 'p4-seat-blank'),
  0::bigint,
  'rpc_save_constituency missing reason leaves no row'
);

select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['p4-open'], now() - interval '1 hour', now() + interval '1 hour', 'phase 4 silence');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_save_constituency('p4-seat-silenced', 'AC', 95, 'Silenced seat', null, null, 'Seat during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_save_constituency inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'phase 4 silence';

-- rpc_save_silence_window
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_save_silence_window(null, array['p4-open'], now(), now() + interval '2 hours', 'Phase 4 window', 'Open a silence window')$$
  ),
  'rpc_save_silence_window allowed role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_silence_window(null, array['p4-open'], now(), now() + interval '2 hours', 'Forbidden window', 'Editor opens a window')$$
  ),
  '42501',
  'forbidden role',
  'rpc_save_silence_window forbidden role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_save_silence_window(null, array['p4-open'], now(), now() + interval '2 hours', 'Missing reason window', '')$$
  ),
  'P0001',
  'reason required',
  'rpc_save_silence_window missing reason'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    $$select public.rpc_save_silence_window(null, array['p4-open'], now(), now() - interval '1 hour', 'Backwards window', 'Backwards range')$$
  ),
  'P0001',
  'window range',
  'rpc_save_silence_window rejects an end before the start'
);

-- staff views hide rows from people who are not staff, and never select contact email
select is(
  public._as_user_bigint('11111111-1111-4111-8111-111111111111', 'select count(*) from public.v_my_staff'),
  1::bigint,
  'v_my_staff returns the caller'
);
select is(
  public._as_user_bigint('44444444-4444-4444-8444-444444444444', 'select count(*) from public.v_editor_entries'),
  0::bigint,
  'v_editor_entries hides rows from a non-staff user'
);
select is(
  (select open_count from public.v_editor_open_corrections),
  0,
  'open corrections count is hidden without a staff session'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'v_editor_open_corrections'
      and column_name = 'contact_email'
  ),
  'open corrections view has no contact email'
);

select * from finish();
rollback;
