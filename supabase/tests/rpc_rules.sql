-- SQL tests for the phase 1 rpc_ functions.
-- Run with: supabase test db
-- Each file is one transaction. Fixtures roll back.

begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(101);

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

select set_config('app.reason', 'Test fixture', true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'editor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'reviewer@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'admin@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'outsider@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into public.staff (user_id, role, display_name) values
  ('11111111-1111-4111-8111-111111111111', 'editor', 'Editor'),
  ('22222222-2222-4222-8222-222222222222', 'reviewer', 'Reviewer'),
  ('33333333-3333-4333-8333-333333333333', 'admin', 'Admin');

insert into public.parties (id, name) values ('sample', 'Sample party');
insert into public.constituencies (id, kind, number, name) values
  ('AC-099', 'AC', 99, 'Open seat'),
  ('AC-001', 'AC', 1, 'Silenced seat');
insert into public.people (id, slug, name, constituency_id) values
  ('55555555-5555-4555-8555-555555555555', 'person-open', 'Open person', 'AC-099'),
  ('66666666-6666-4666-8666-666666666666', 'person-silenced', 'Silenced person', 'AC-001');
insert into public.cases (id, slug, title) values
  ('77777777-7777-4777-8777-777777777777', 'case-open', 'Open case'),
  ('88888888-8888-4888-8888-888888888888', 'case-silenced', 'Silenced case');
insert into public.case_people (case_id, person_id) values
  ('77777777-7777-4777-8777-777777777777', '55555555-5555-4555-8555-555555555555'),
  ('88888888-8888-4888-8888-888888888888', '66666666-6666-4666-8666-666666666666');
insert into public.promises (id, manifesto, body) values
  ('99999999-9999-4999-8999-999999999999', 'sample-manifesto', 'Sample promise');

-- rpc_save_source
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_source('MEDIA'::public.source_type, 'https://example.com/allowed-source', 'Allowed source', 'Example paper', '2026-10-25'::date, 'Allowed source save')$$
  ),
  'rpc_save_source allowed role'
);
select is(
  (select count(*) from public.sources where title = 'Allowed source'),
  1::bigint,
  'rpc_save_source allowed role writes one source'
);
select ok(
  exists (
    select 1 from public.audit_log
    where table_name = 'sources' and reason = 'Allowed source save'
  ),
  'rpc_save_source writes the reason to audit_log'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_save_source('MEDIA'::public.source_type, 'https://example.com/forbidden-source', 'Forbidden source', 'Example paper', '2026-10-25'::date, 'Reviewer source save')$$
  ),
  '42501',
  'forbidden role',
  'rpc_save_source forbidden role'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_source('MEDIA'::public.source_type, 'https://example.com/missing-reason-source', 'Missing reason source', 'Example paper', '2026-10-25'::date, '')$$
  ),
  'P0001',
  'reason required',
  'rpc_save_source missing reason'
);
select is(
  (select count(*) from public.sources where title = 'Missing reason source'),
  0::bigint,
  'rpc_save_source missing reason leaves no row'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_source('COURT'::public.source_type, null, 'Unlinked court source', 'Court', '2026-10-25'::date, 'Court source without url')$$
  ),
  '23514',
  'tier-1 source requires a url',
  'rpc_save_source tier-1 without url'
);
select is(
  (select count(*) from public.sources where title = 'Unlinked court source'),
  0::bigint,
  'rpc_save_source tier-1 without url leaves no row'
);

select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'sql test window');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_source('MEDIA'::public.source_type, 'https://example.com/silenced-source', 'Silenced source', 'Example paper', '2026-10-25'::date, 'Source during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_save_source inside silence window'
);
select is(
  (select count(*) from public.sources where title = 'Silenced source'),
  0::bigint,
  'rpc_save_source inside silence window leaves no row'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'sql test window';

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_source('MEDIA'::public.source_type, 'https://example.com/self-source', 'Self source', 'Example paper', '2026-10-25'::date, 'Source saved by its author')$$
  ),
  'rpc_save_source self-approval setup'
);
select is(
  (select count(*) from public.entries where source_id = (select id from public.sources where title = 'Self source')),
  0::bigint,
  'rpc_save_source self-approval does not approve an entry'
);

-- rpc_save_entry
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_entry('55555555-5555-4555-8555-555555555555', 'work'::public.entry_kind, 'Allowed work entry', null, (select id from public.sources where title = 'Allowed source'), 'Allowed work entry')$$
  ),
  'rpc_save_entry allowed role'
);
select is(
  (select status::text from public.entries where body = 'Allowed work entry'),
  'published',
  'rpc_save_entry publishes a work entry'
);
select ok(
  exists (select 1 from public.audit_log where reason = 'Allowed work entry' and table_name = 'entries'),
  'rpc_save_entry writes the reason to audit_log'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_save_entry('55555555-5555-4555-8555-555555555555', 'work'::public.entry_kind, 'Forbidden entry', null, (select id from public.sources where title = 'Allowed source'), 'Reviewer entry save')$$
  ),
  '42501',
  'forbidden role',
  'rpc_save_entry forbidden role'
);
select is(
  (select count(*) from public.entries where body = 'Forbidden entry'),
  0::bigint,
  'rpc_save_entry forbidden role leaves no row'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_entry('55555555-5555-4555-8555-555555555555', 'work'::public.entry_kind, 'Missing reason entry', null, (select id from public.sources where title = 'Allowed source'), '   ')$$
  ),
  'P0001',
  'reason required',
  'rpc_save_entry missing reason'
);
select is(
  (select count(*) from public.entries where body = 'Missing reason entry'),
  0::bigint,
  'rpc_save_entry missing reason leaves no row'
);

select set_config('app.reason', 'Fixture for a tier-1 source without a url', true);
alter table public.sources drop constraint tier1_needs_url;
insert into public.sources (id, type, title)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'COURT', 'Bad court source');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_entry('55555555-5555-4555-8555-555555555555', 'issue'::public.entry_kind, 'Tier-1 entry', null, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Entry on an unlinked court source')$$
  ),
  '23514',
  'tier-1 source requires a url',
  'rpc_save_entry tier-1 without url'
);
select is(
  (select count(*) from public.entries where body = 'Tier-1 entry'),
  0::bigint,
  'rpc_save_entry tier-1 without url leaves no row'
);
select set_config('app.reason', 'Remove the bad court source', true);
delete from public.sources where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
alter table public.sources add constraint tier1_needs_url check (
  type not in ('COURT', 'CAG', 'ECI', 'SPKR') or url is not null
);

select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'sql test window');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_entry('66666666-6666-4666-8666-666666666666', 'work'::public.entry_kind, 'Silenced entry', null, (select id from public.sources where title = 'Allowed source'), 'Entry during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_save_entry inside silence window'
);
select is(
  (select count(*) from public.entries where body = 'Silenced entry'),
  0::bigint,
  'rpc_save_entry inside silence window leaves no row'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'sql test window';

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_entry('55555555-5555-4555-8555-555555555555', 'issue'::public.entry_kind, 'Issue left pending', null, (select id from public.sources where title = 'Allowed source'), 'Issue saved by its author')$$
  ),
  'rpc_save_entry self-approval setup'
);
select is(
  (select status::text from public.entries where body = 'Issue left pending'),
  'pending_review',
  'rpc_save_entry self-approval leaves an issue unpublished'
);
select ok(
  (select approved_by is null from public.entries where body = 'Issue left pending'),
  'rpc_save_entry self-approval does not record the author as approver'
);

-- rpc_approve
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_entry('55555555-5555-4555-8555-555555555555', 'issue'::public.entry_kind, 'Issue ready for review', null, (select id from public.sources where title = 'Allowed source'), 'Issue for a second person')$$
  ),
  'rpc_approve fixture'
);
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_approve('entry', (select id from public.entries where body = 'Issue ready for review'), 'Reviewer approves another person')$$
  ),
  'rpc_approve allowed role'
);
select is(
  (select status::text from public.entries where body = 'Issue ready for review'),
  'published',
  'rpc_approve publishes the issue'
);
select is(
  (select approved_by::text from public.entries where body = 'Issue ready for review'),
  '22222222-2222-4222-8222-222222222222',
  'rpc_approve records the other person'
);
select ok(
  exists (select 1 from public.audit_log where reason = 'Reviewer approves another person'),
  'rpc_approve writes the reason to audit_log'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_entry('55555555-5555-4555-8555-555555555555', 'issue'::public.entry_kind, 'Issue an editor cannot approve', null, (select id from public.sources where title = 'Allowed source'), 'Issue for the forbidden approval test')$$
  ),
  'rpc_approve forbidden fixture'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_approve('entry', (select id from public.entries where body = 'Issue an editor cannot approve'), 'Editor tries to approve')$$
  ),
  '42501',
  'forbidden role',
  'rpc_approve forbidden role'
);
select is(
  (select status::text from public.entries where body = 'Issue an editor cannot approve'),
  'pending_review',
  'rpc_approve forbidden role leaves the issue pending'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_approve('entry', (select id from public.entries where body = 'Issue an editor cannot approve'), '')$$
  ),
  'P0001',
  'reason required',
  'rpc_approve missing reason'
);

select set_config('app.reason', 'Fixture for a tier-1 source without a url', true);
alter table public.sources drop constraint tier1_needs_url;
insert into public.sources (id, type, title)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'COURT', 'Bad court source');
insert into public.entries (id, person_id, kind, body, source_id, status, created_by)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '55555555-5555-4555-8555-555555555555',
  'issue',
  'Tier-1 approval',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'pending_review',
  '11111111-1111-4111-8111-111111111111'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_approve('entry', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'Approve an unlinked court source')$$
  ),
  '23514',
  'tier-1 source requires a url',
  'rpc_approve tier-1 without url'
);
select is(
  (select status::text from public.entries where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
  'pending_review',
  'rpc_approve tier-1 without url leaves the issue pending'
);
select set_config('app.reason', 'Remove the tier-1 approval fixture', true);
delete from public.entries where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
delete from public.sources where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
alter table public.sources add constraint tier1_needs_url check (
  type not in ('COURT', 'CAG', 'ECI', 'SPKR') or url is not null
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_entry('66666666-6666-4666-8666-666666666666', 'issue'::public.entry_kind, 'Issue in a silenced seat', null, (select id from public.sources where title = 'Allowed source'), 'Issue saved before the window')$$
  ),
  'rpc_approve silence fixture'
);
select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'sql test window');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_approve('entry', (select id from public.entries where body = 'Issue in a silenced seat'), 'Approve during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_approve inside silence window'
);
select is(
  (select status::text from public.entries where body = 'Issue in a silenced seat'),
  'pending_review',
  'rpc_approve inside silence window leaves the issue pending'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'sql test window';

select set_config('app.reason', 'Point the issue at the reviewer', true);
update public.entries
set created_by = '22222222-2222-4222-8222-222222222222'
where body = 'Issue left pending';
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_approve('entry', (select id from public.entries where body = 'Issue left pending'), 'Reviewer approves their own issue')$$
  ),
  'P0001',
  'self-approval',
  'rpc_approve self-approval'
);
select is(
  (select status::text from public.entries where body = 'Issue left pending'),
  'pending_review',
  'rpc_approve self-approval leaves the issue pending'
);

-- rpc_retract
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_retract((select id from public.entries where body = 'Allowed work entry'), 'Retract the work entry')$$
  ),
  'rpc_retract allowed role'
);
select is(
  (select status::text from public.entries where body = 'Allowed work entry'),
  'retracted',
  'rpc_retract marks the entry retracted'
);
select is(
  (select count(*) from public.entries where body = 'Allowed work entry'),
  1::bigint,
  'rpc_retract leaves the row in place'
);
select ok(
  exists (select 1 from public.audit_log where reason = 'Retract the work entry'),
  'rpc_retract writes the reason to audit_log'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '44444444-4444-4444-8444-444444444444',
    $$select public.rpc_retract((select id from public.entries where body = 'Issue ready for review'), 'Outsider retracts')$$
  ),
  '42501',
  'forbidden role',
  'rpc_retract forbidden role'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_save_entry('55555555-5555-4555-8555-555555555555', 'work'::public.entry_kind, 'Work entry kept published', null, (select id from public.sources where title = 'Allowed source'), 'Work entry for the missing reason retract test')$$
  ),
  'rpc_retract missing reason fixture'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_retract((select id from public.entries where body = 'Work entry kept published'), null)$$
  ),
  'P0001',
  'reason required',
  'rpc_retract missing reason'
);
select is(
  (select status::text from public.entries where body = 'Work entry kept published'),
  'published',
  'rpc_retract missing reason leaves the entry published'
);

select set_config('app.reason', 'Fixture for a published tier-1 source without a url', true);
alter table public.sources drop constraint tier1_needs_url;
insert into public.sources (id, type, title)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'COURT', 'Bad court source');
insert into public.entries (id, person_id, kind, body, source_id, status, created_by, approved_by)
values (
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  '55555555-5555-4555-8555-555555555555',
  'work',
  'Tier-1 retract',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'published',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_retract('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Retract an unlinked court source')$$
  ),
  '23514',
  'tier-1 source requires a url',
  'rpc_retract tier-1 without url'
);
select is(
  (select status::text from public.entries where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'),
  'published',
  'rpc_retract tier-1 without url leaves the entry published'
);
select set_config('app.reason', 'Give the fixture source a url so the constraint can return', true);
update public.sources
set url = 'https://example.com/restored-order'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
alter table public.sources add constraint tier1_needs_url check (
  type not in ('COURT', 'CAG', 'ECI', 'SPKR') or url is not null
);

select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'sql test window');
select set_config('app.reason', 'Published entry in a silenced seat', true);
insert into public.entries (id, person_id, kind, body, source_id, status, created_by, approved_by)
values (
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  '66666666-6666-4666-8666-666666666666',
  'work',
  'Published entry in a silenced seat',
  (select id from public.sources where title = 'Allowed source'),
  'published',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_retract('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'Retract during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_retract inside silence window'
);
select is(
  (select status::text from public.entries where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'),
  'published',
  'rpc_retract inside silence window leaves the entry published'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'sql test window';

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_retract((select id from public.entries where body = 'Issue an editor cannot approve'), 'Retract a pending issue')$$
  ),
  'P0001',
  'not published',
  'rpc_retract self-approval'
);
select is(
  (select status::text from public.entries where body = 'Issue an editor cannot approve'),
  'pending_review',
  'rpc_retract self-approval does not approve the pending issue'
);
select is(
  (select count(*) from public.entries where body = 'Issue an editor cannot approve'),
  1::bigint,
  'rpc_retract self-approval does not delete the row'
);

-- rpc_add_case_event
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_add_case_event('77777777-7777-4777-8777-777777777777', 1, '2026-10-25'::date, 'Allowed case event', (select id from public.sources where title = 'Allowed source'), 'Allowed case event')$$
  ),
  'rpc_add_case_event allowed role'
);
select is(
  (select status::text from public.case_events where note = 'Allowed case event'),
  'pending_review',
  'rpc_add_case_event saves a case event for review'
);
select ok(
  exists (select 1 from public.audit_log where reason = 'Allowed case event' and table_name = 'case_events'),
  'rpc_add_case_event writes the reason to audit_log'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_add_case_event('77777777-7777-4777-8777-777777777777', 2, '2026-10-25'::date, 'Forbidden case event', (select id from public.sources where title = 'Allowed source'), 'Reviewer case event')$$
  ),
  '42501',
  'forbidden role',
  'rpc_add_case_event forbidden role'
);
select is(
  (select count(*) from public.case_events where note = 'Forbidden case event'),
  0::bigint,
  'rpc_add_case_event forbidden role leaves no row'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_add_case_event('77777777-7777-4777-8777-777777777777', 3, '2026-10-25'::date, 'Missing reason case event', (select id from public.sources where title = 'Allowed source'), '')$$
  ),
  'P0001',
  'reason required',
  'rpc_add_case_event missing reason'
);
select is(
  (select count(*) from public.case_events where note = 'Missing reason case event'),
  0::bigint,
  'rpc_add_case_event missing reason leaves no row'
);

select set_config('app.reason', 'Fixture for a tier-1 source without a url', true);
alter table public.sources drop constraint tier1_needs_url;
insert into public.sources (id, type, title)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'ECI', 'Bad election source');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_add_case_event('77777777-7777-4777-8777-777777777777', 4, '2026-10-25'::date, 'Tier-1 case event', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Case event on an unlinked election source')$$
  ),
  '23514',
  'tier-1 source requires a url',
  'rpc_add_case_event tier-1 without url'
);
select is(
  (select count(*) from public.case_events where note = 'Tier-1 case event'),
  0::bigint,
  'rpc_add_case_event tier-1 without url leaves no row'
);
select set_config('app.reason', 'Remove the bad election source', true);
delete from public.sources where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
alter table public.sources add constraint tier1_needs_url check (
  type not in ('COURT', 'CAG', 'ECI', 'SPKR') or url is not null
);

select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'sql test window');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_add_case_event('88888888-8888-4888-8888-888888888888', 1, '2026-10-25'::date, 'Silenced case event', (select id from public.sources where title = 'Allowed source'), 'Case event during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_add_case_event inside silence window'
);
select is(
  (select count(*) from public.case_events where note = 'Silenced case event'),
  0::bigint,
  'rpc_add_case_event inside silence window leaves no row'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'sql test window';

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_add_case_event('77777777-7777-4777-8777-777777777777', 5, '2026-10-25'::date, 'Case event left pending', (select id from public.sources where title = 'Allowed source'), 'Case event saved by its author')$$
  ),
  'rpc_add_case_event self-approval setup'
);
select set_config('app.reason', 'Point the case event at the reviewer', true);
update public.case_events
set created_by = '22222222-2222-4222-8222-222222222222'
where note = 'Case event left pending';
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_approve('case_event', (select id from public.case_events where note = 'Case event left pending'), 'Reviewer approves their own case event')$$
  ),
  'P0001',
  'self-approval',
  'rpc_add_case_event self-approval'
);
select is(
  (select status::text from public.case_events where note = 'Case event left pending'),
  'pending_review',
  'rpc_add_case_event self-approval leaves the event pending'
);

-- rpc_update_promise
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_update_promise('99999999-9999-4999-8999-999999999999', 'partial'::public.promise_status, 'Allowed promise update', (select id from public.sources where title = 'Allowed source'), 'Allowed promise update')$$
  ),
  'rpc_update_promise allowed role'
);
select is(
  (select count(*) from public.promise_updates where detail = 'Allowed promise update'),
  1::bigint,
  'rpc_update_promise writes one update'
);
select ok(
  exists (select 1 from public.audit_log where reason = 'Allowed promise update' and table_name = 'promise_updates'),
  'rpc_update_promise writes the reason to audit_log'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_update_promise('99999999-9999-4999-8999-999999999999', 'partial'::public.promise_status, 'Forbidden promise update', (select id from public.sources where title = 'Allowed source'), 'Reviewer promise update')$$
  ),
  '42501',
  'forbidden role',
  'rpc_update_promise forbidden role'
);
select is(
  (select count(*) from public.promise_updates where detail = 'Forbidden promise update'),
  0::bigint,
  'rpc_update_promise forbidden role leaves no row'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_update_promise('99999999-9999-4999-8999-999999999999', 'partial'::public.promise_status, 'Missing reason promise update', (select id from public.sources where title = 'Allowed source'), '')$$
  ),
  'P0001',
  'reason required',
  'rpc_update_promise missing reason'
);
select is(
  (select count(*) from public.promise_updates where detail = 'Missing reason promise update'),
  0::bigint,
  'rpc_update_promise missing reason leaves no row'
);

select set_config('app.reason', 'Fixture for a tier-1 source without a url', true);
alter table public.sources drop constraint tier1_needs_url;
insert into public.sources (id, type, title)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'CAG', 'Bad audit source');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_update_promise('99999999-9999-4999-8999-999999999999', 'unverified'::public.promise_status, 'Tier-1 promise update', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Promise update on an unlinked audit')$$
  ),
  '23514',
  'tier-1 source requires a url',
  'rpc_update_promise tier-1 without url'
);
select is(
  (select count(*) from public.promise_updates where detail = 'Tier-1 promise update'),
  0::bigint,
  'rpc_update_promise tier-1 without url leaves no row'
);
select set_config('app.reason', 'Remove the bad audit source', true);
delete from public.sources where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
alter table public.sources add constraint tier1_needs_url check (
  type not in ('COURT', 'CAG', 'ECI', 'SPKR') or url is not null
);

select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'sql test window');
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_update_promise('99999999-9999-4999-8999-999999999999', 'progress'::public.promise_status, 'Silenced promise update', (select id from public.sources where title = 'Allowed source'), 'Promise update during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_update_promise inside silence window'
);
select is(
  (select count(*) from public.promise_updates where detail = 'Silenced promise update'),
  0::bigint,
  'rpc_update_promise inside silence window leaves no row'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'sql test window';

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_update_promise('99999999-9999-4999-8999-999999999999', 'unverified'::public.promise_status, 'Editor promise update', (select id from public.sources where title = 'Allowed source'), 'Promise update by its editor')$$
  ),
  'rpc_update_promise self-approval setup'
);
select is(
  (select created_by::text from public.promise_updates where detail = 'Editor promise update'),
  '11111111-1111-4111-8111-111111111111',
  'rpc_update_promise self-approval is the editor, which a promise status allows'
);
select is(
  (select status::text from public.entries where body = 'Issue left pending'),
  'pending_review',
  'rpc_update_promise self-approval does not approve an issue'
);

-- Direct writes, the public role, and the append-only log.
select set_config('app.reason', '', true);
select throws_ok(
  $$insert into public.parties (id, name) values ('no-reason', 'No reason')$$,
  'P0001',
  'reason required',
  'a write without a reason fails'
);
select is(
  (select count(*) from public.parties where id = 'no-reason'),
  0::bigint,
  'a write without a reason leaves no row'
);
select set_config('app.reason', 'Test fixture', true);

select throws_ok(
  $$update public.audit_log set reason = 'rewritten'$$,
  'P0001',
  'audit_log is append-only',
  'updating audit_log fails for the table owner'
);
select throws_ok(
  $$delete from public.audit_log$$,
  'P0001',
  'audit_log is append-only',
  'deleting audit_log fails for the table owner'
);
select throws_ok(
  'truncate public.audit_log',
  'P0001',
  'audit_log is append-only',
  'truncating audit_log fails for the table owner'
);

set local role service_role;
select throws_ok(
  $$update public.audit_log set reason = 'rewritten'$$,
  '42501',
  'permission denied for table audit_log',
  'service_role cannot update audit_log'
);
select throws_ok(
  $$delete from public.audit_log$$,
  '42501',
  'permission denied for table audit_log',
  'service_role cannot delete audit_log'
);
reset role;

set local role anon;
select lives_ok('select * from public.v_people', 'anon can read v_people');
select lives_ok('select * from public.v_entries', 'anon can read v_entries');
select lives_ok('select * from public.v_cases', 'anon can read v_cases');
select lives_ok('select * from public.v_promises', 'anon can read v_promises');
select lives_ok('select * from public.v_changelog', 'anon can read v_changelog');
select throws_ok(
  'select * from public.entries',
  '42501',
  'permission denied for table entries',
  'anon cannot read entries'
);
select throws_ok(
  'select * from public.audit_log',
  '42501',
  'permission denied for table audit_log',
  'anon cannot read audit_log'
);
select throws_ok(
  $$insert into public.parties (id, name) values ('anon-party', 'Anon')$$,
  '42501',
  'permission denied for table parties',
  'anon cannot insert a party'
);
reset role;

select ok(
  (
    select array_agg(column_name::text order by column_name)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'v_changelog'
  ) = array['action', 'actor_name', 'at', 'id', 'reason', 'row_id', 'table_name']::text[],
  'v_changelog exposes actor_name and no email'
);

select * from finish();
rollback;
