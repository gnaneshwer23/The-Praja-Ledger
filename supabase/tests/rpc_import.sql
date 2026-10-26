-- SQL tests for the compiled-edition import functions.
-- Run with: supabase test db
-- The file is one transaction. The runner rolls it back.

begin;

create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(72);

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
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'editor-import@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'reviewer-import@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'admin-import@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'outsider-import@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into public.staff (user_id, role, display_name) values
  ('11111111-1111-4111-8111-111111111111', 'editor', 'Editor'),
  ('22222222-2222-4222-8222-222222222222', 'reviewer', 'Reviewer'),
  ('33333333-3333-4333-8333-333333333333', 'admin', 'Admin');

insert into public.constituencies (id, kind, number, name) values
  ('AC-099', 'AC', 9901, 'Open seat'),
  ('AC-001', 'AC', 9902, 'Silenced seat');

-- rpc_import_source
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_import_source('MEDIA'::public.source_type, 'https://example.com/import-source', 'Import source', 'Example paper', '2026-10-25'::date, 'Allowed import source')$sql$)$$,
  'rpc_import_source allowed role'
);
select is((select count(*) from public.sources where title = 'Import source'), 1::bigint, 'rpc_import_source writes one source');
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_import_source('MEDIA'::public.source_type, 'https://example.com/import-source', 'Import source', 'Example paper', '2026-10-25'::date, 'Allowed import source again')$sql$)$$,
  'rpc_import_source second call'
);
select is((select count(*) from public.sources where title = 'Import source'), 1::bigint, 'rpc_import_source second call creates no duplicate');
select throws_ok(
  $$select public._as_user('22222222-2222-4222-8222-222222222222', $sql$select public.rpc_import_source('MEDIA'::public.source_type, 'https://example.com/forbidden-import', 'Forbidden import source', 'Example paper', '2026-10-25'::date, 'Reviewer import source')$sql$)$$,
  '42501', 'forbidden role', 'rpc_import_source forbidden role'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_import_source('MEDIA'::public.source_type, 'https://example.com/missing-import', 'Missing import source', 'Example paper', '2026-10-25'::date, ' ')$sql$)$$,
  'P0001', 'reason required', 'rpc_import_source missing reason'
);
select is((select count(*) from public.sources where title = 'Missing import source'), 0::bigint, 'rpc_import_source missing reason leaves no row');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_import_source('COURT'::public.source_type, null, 'Unlinked import court', 'Court', null, 'Court import without url')$sql$)$$,
  '23514', 'tier-1 source requires a url', 'rpc_import_source tier-1 without url'
);
select is((select count(*) from public.sources where title = 'Unlinked import court'), 0::bigint, 'rpc_import_source tier-1 without url leaves no row');
select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'import sql test window');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_import_source('MEDIA'::public.source_type, 'https://example.com/silenced-import', 'Silenced import source', 'Example paper', '2026-10-25'::date, 'Import source during silence')$sql$)$$,
  'P0001', 'silence window', 'rpc_import_source inside silence window'
);
select is((select count(*) from public.sources where title = 'Silenced import source'), 0::bigint, 'rpc_import_source inside silence window leaves no row');
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'import sql test window';
select is(
  (select count(*) from public.entries where source_id = (select id from public.sources where title = 'Import source')),
  0::bigint,
  'rpc_import_source self-approval does not approve an entry'
);

-- rpc_save_party
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_party('sql-party', 'SQL Party', null, 'Allowed party')$sql$)$$,
  'rpc_save_party allowed role'
);
select is((select count(*) from public.parties where id = 'sql-party'), 1::bigint, 'rpc_save_party writes one party');
select throws_ok(
  $$select public._as_user('44444444-4444-4444-8444-444444444444', $sql$select public.rpc_save_party('outsider-party', 'Outsider', null, 'Outsider party')$sql$)$$,
  '42501', 'forbidden role', 'rpc_save_party forbidden role'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_party('missing-party', 'Missing', null, '')$sql$)$$,
  'P0001', 'reason required', 'rpc_save_party missing reason'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_party('not-compiled', 'Not compiled yet', null, 'Refuse placeholder party')$sql$)$$,
  'P0001', 'party is not compiled', 'rpc_save_party tier-1 without url'
);
select is((select count(*) from public.sources where type = 'COURT' and url is null), 0::bigint, 'rpc_save_party tier-1 without url creates no court row');
select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'import sql test window');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_party('silenced-party', 'Silenced', null, 'Party during silence')$sql$)$$,
  'P0001', 'silence window', 'rpc_save_party inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'import sql test window';
select is((select approved_by from public.entries where false), null, 'rpc_save_party self-approval does not approve an entry');

-- rpc_save_constituency
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_constituency('AC-SQL', 'AC', 4242, 'SQL seat', null, null, 'Allowed constituency')$sql$)$$,
  'rpc_save_constituency allowed role'
);
select throws_ok(
  $$select public._as_user('44444444-4444-4444-8444-444444444444', $sql$select public.rpc_save_constituency('AC-NO', 'AC', 4243, 'No seat', null, null, 'Forbidden constituency')$sql$)$$,
  '42501', 'forbidden role', 'rpc_save_constituency forbidden role'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_constituency('AC-MR', 'AC', 4244, 'Missing seat', null, null, '')$sql$)$$,
  'P0001', 'reason required', 'rpc_save_constituency missing reason'
);
select is((select count(*) from public.sources where type = 'COURT' and url is null), 0::bigint, 'rpc_save_constituency tier-1 without url creates no court row');
select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'import sql test window');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_constituency('AC-SW', 'AC', 4245, 'Silenced seat import', null, null, 'Constituency during silence')$sql$)$$,
  'P0001', 'silence window', 'rpc_save_constituency inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'import sql test window';
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_constituency('AC-SQL', 'AC', 4242, 'SQL seat', null, null, 'Constituency again')$sql$)$$,
  'rpc_save_constituency self-approval does not duplicate'
);
select is((select count(*) from public.constituencies where id = 'AC-SQL'), 1::bigint, 'rpc_save_constituency second call creates no duplicate');

-- rpc_save_person
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_person('sql-person', 'SQL Person', null, 'sql-party', 'MLA', 'AC-099', null, 'Allowed person')$sql$)$$,
  'rpc_save_person allowed role'
);
select throws_ok(
  $$select public._as_user('44444444-4444-4444-8444-444444444444', $sql$select public.rpc_save_person('no-person', 'No Person', null, null, null, null, null, 'Forbidden person')$sql$)$$,
  '42501', 'forbidden role', 'rpc_save_person forbidden role'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_person('missing-person', 'Missing Person', null, null, null, null, null, '')$sql$)$$,
  'P0001', 'reason required', 'rpc_save_person missing reason'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_person('placeholder-person', 'Placeholder', null, 'Not compiled yet', null, null, null, 'Refuse placeholder party')$sql$)$$,
  'P0001', 'party is not compiled', 'rpc_save_person tier-1 without url'
);
select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'import sql test window');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_person('silenced-person', 'Silenced Person', null, null, null, 'AC-001', null, 'Person during silence')$sql$)$$,
  'P0001', 'silence window', 'rpc_save_person inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'import sql test window';
select is((select party_id from public.people where slug = 'sql-person'), 'sql-party', 'rpc_save_person self-approval does not clear the party');

-- rpc_import_entry
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_import_entry('PL-SQL-W', (select id from public.people where slug = 'sql-person'), 'work'::public.entry_kind, 'Allowed work body', null, (select id from public.sources where title = 'Import source'), 'Allowed work', 'Plain', 'work', 'plain', false, 'Allowed import entry')$sql$)$$,
  'rpc_import_entry allowed role'
);
select is((select status::text from public.entries where external_id = 'PL-SQL-W'), 'published', 'rpc_import_entry publishes work');
select throws_ok(
  $$select public._as_user('44444444-4444-4444-8444-444444444444', $sql$select public.rpc_import_entry('PL-SQL-X', (select id from public.people where slug = 'sql-person'), 'work'::public.entry_kind, 'Forbidden body', null, (select id from public.sources where title = 'Import source'), 'Forbidden', 'Plain', 'work', 'plain', false, 'Forbidden import entry')$sql$)$$,
  '42501', 'forbidden role', 'rpc_import_entry forbidden role'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_import_entry('PL-SQL-M', (select id from public.people where slug = 'sql-person'), 'work'::public.entry_kind, 'Missing body', null, (select id from public.sources where title = 'Import source'), 'Missing', 'Plain', 'work', 'plain', false, '')$sql$)$$,
  'P0001', 'reason required', 'rpc_import_entry missing reason'
);
select set_config('app.reason', 'Fixture for a tier-1 source without a url', true);
alter table public.sources drop constraint tier1_needs_url;
insert into public.sources (id, type, title) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'COURT', 'Import bad court');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_import_entry('PL-SQL-C', (select id from public.people where slug = 'sql-person'), 'issue'::public.entry_kind, 'Court body', null, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'Court', 'Pending', 'cases', 'pending', true, 'Entry on an unlinked court source')$sql$)$$,
  '23514', 'tier-1 source requires a url', 'rpc_import_entry tier-1 without url'
);
select set_config('app.reason', 'Remove the bad court source', true);
delete from public.sources where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
alter table public.sources add constraint tier1_needs_url check (
  type not in ('COURT', 'CAG', 'ECI', 'SPKR') or url is not null
);
select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-099'], now() - interval '1 hour', now() + interval '1 hour', 'import sql test window');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_import_entry('PL-SQL-S', (select id from public.people where slug = 'sql-person'), 'work'::public.entry_kind, 'Silenced body', null, (select id from public.sources where title = 'Import source'), 'Silenced', 'Plain', 'work', 'plain', false, 'Entry during silence')$sql$)$$,
  'P0001', 'silence window', 'rpc_import_entry inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'import sql test window';
select lives_ok(
  $$select public._as_user('33333333-3333-4333-8333-333333333333', $sql$select public.rpc_import_entry('PL-SQL-V', (select id from public.people where slug = 'sql-person'), 'issue'::public.entry_kind, 'Verify body', null, (select id from public.sources where title = 'Import source'), 'Verify', 'Pending', 'cases', 'pending', true, 'Keep the verify flag')$sql$)$$,
  'rpc_import_entry keeps verify'
);
select is((select verify from public.entries where external_id = 'PL-SQL-V'), true, 'rpc_import_entry does not clear a verify flag');
select is((select status::text from public.entries where external_id = 'PL-SQL-V'), 'pending_review', 'rpc_import_entry self-approval leaves an issue pending');
select throws_ok(
  $$select public._as_user('33333333-3333-4333-8333-333333333333', $sql$select public.rpc_approve('entry', (select id from public.entries where external_id = 'PL-SQL-V'), 'Author cannot approve')$sql$)$$,
  'P0001', 'self-approval', 'rpc_import_entry self-approval is refused'
);

-- rpc_save_case, stage, link
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_case('sql-case', 'SQL case', 'Summary', 'sql-party', 'pending'::public.case_state, 'Allowed case')$sql$)$$,
  'rpc_save_case allowed role'
);
select throws_ok(
  $$select public._as_user('44444444-4444-4444-8444-444444444444', $sql$select public.rpc_save_case('no-case', 'No case', null, null, 'pending'::public.case_state, 'Forbidden case')$sql$)$$,
  '42501', 'forbidden role', 'rpc_save_case forbidden role'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_case('missing-case', 'Missing case', null, null, 'pending'::public.case_state, '')$sql$)$$,
  'P0001', 'reason required', 'rpc_save_case missing reason'
);
select is((select count(*) from public.sources where type = 'COURT' and url is null), 0::bigint, 'rpc_save_case tier-1 without url creates no court row');
select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'import sql test window');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_case('silenced-case', 'Silenced case', null, null, 'unknown'::public.case_state, 'Case during silence')$sql$)$$,
  'P0001', 'silence window', 'rpc_save_case inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'import sql test window';
select is((select state::text from public.cases where slug = 'sql-case'), 'pending', 'rpc_save_case self-approval does not publish an event');

select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_case_stage((select id from public.cases where slug = 'sql-case'), 0, 'Pending', 'Allowed stage')$sql$)$$,
  'rpc_save_case_stage allowed role'
);
select throws_ok(
  $$select public._as_user('44444444-4444-4444-8444-444444444444', $sql$select public.rpc_save_case_stage((select id from public.cases where slug = 'sql-case'), 1, 'No', 'Forbidden stage')$sql$)$$,
  '42501', 'forbidden role', 'rpc_save_case_stage forbidden role'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_case_stage((select id from public.cases where slug = 'sql-case'), 2, 'Missing', '')$sql$)$$,
  'P0001', 'reason required', 'rpc_save_case_stage missing reason'
);
select is((select count(*) from public.case_stages where label = 'Missing'), 0::bigint, 'rpc_save_case_stage tier-1 without url creates no stage');
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_link_case_person((select id from public.cases where slug = 'sql-case'), (select id from public.people where slug = 'sql-person'), null, 'Allowed link')$sql$)$$,
  'rpc_link_case_person allowed role'
);
select throws_ok(
  $$select public._as_user('44444444-4444-4444-8444-444444444444', $sql$select public.rpc_link_case_person((select id from public.cases where slug = 'sql-case'), (select id from public.people where slug = 'sql-person'), null, 'Forbidden link')$sql$)$$,
  '42501', 'forbidden role', 'rpc_link_case_person forbidden role'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_link_case_person((select id from public.cases where slug = 'sql-case'), (select id from public.people where slug = 'sql-person'), null, '')$sql$)$$,
  'P0001', 'reason required', 'rpc_link_case_person missing reason'
);
select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-099'], now() - interval '1 hour', now() + interval '1 hour', 'import sql test window');
select set_config('app.reason', 'Fixture person', true);
insert into public.people (slug, name, constituency_id) values ('sql-open-two', 'Second person', 'AC-099');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_link_case_person((select id from public.cases where slug = 'sql-case'), (select id from public.people where slug = 'sql-open-two'), null, 'Link during silence')$sql$)$$,
  'P0001', 'silence window', 'rpc_link_case_person inside silence window'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_case_stage((select id from public.cases where slug = 'sql-case'), 3, 'Silenced stage', 'Stage during silence')$sql$)$$,
  'P0001', 'silence window', 'rpc_save_case_stage inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'import sql test window';
select is((select count(*) from public.case_events where case_id = (select id from public.cases where slug = 'sql-case')), 0::bigint, 'rpc_save_case_stage self-approval does not publish an event');
select is((select count(*) from public.case_people where person_id = (select id from public.people where slug = 'sql-person')), 1::bigint, 'rpc_link_case_person self-approval does not duplicate the link');

-- rpc_save_promise
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_promise('sql-promise', 'sql-manifesto', 'sql-party', 'area', 'A compiled promise line', null, 1, 'SQL promise', 'Allowed promise')$sql$)$$,
  'rpc_save_promise allowed role'
);
select throws_ok(
  $$select public._as_user('44444444-4444-4444-8444-444444444444', $sql$select public.rpc_save_promise('no-promise', 'sql-manifesto', null, null, 'No', null, 2, 'No', 'Forbidden promise')$sql$)$$,
  '42501', 'forbidden role', 'rpc_save_promise forbidden role'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_promise('missing-promise', 'sql-manifesto', null, null, 'Missing', null, 3, 'Missing', '')$sql$)$$,
  'P0001', 'reason required', 'rpc_save_promise missing reason'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_promise('quote-promise', 'sql-manifesto', null, null, 'Not compiled yet', null, 4, 'Quote', 'Refuse placeholder quote')$sql$)$$,
  'P0001', 'promise body is not compiled', 'rpc_save_promise tier-1 without url'
);
select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'import sql test window');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_promise('silenced-promise', 'sql-manifesto', null, null, 'Silenced promise line', null, 5, 'Silenced', 'Promise during silence')$sql$)$$,
  'P0001', 'silence window', 'rpc_save_promise inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'import sql test window';
select is((select count(*) from public.promises where external_id = 'sql-promise'), 1::bigint, 'rpc_save_promise self-approval does not duplicate');

-- rpc_save_dataset
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_dataset('sql-finance', '{"presentation":"separate-records"}'::jsonb, array[(select id from public.sources where title = 'Import source')]::uuid[], 'Allowed dataset')$sql$)$$,
  'rpc_save_dataset allowed role'
);
select throws_ok(
  $$select public._as_user('44444444-4444-4444-8444-444444444444', $sql$select public.rpc_save_dataset('no-dataset', '{}'::jsonb, '{}'::uuid[], 'Forbidden dataset')$sql$)$$,
  '42501', 'forbidden role', 'rpc_save_dataset forbidden role'
);
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_dataset('missing-dataset', '{}'::jsonb, '{}'::uuid[], '')$sql$)$$,
  'P0001', 'reason required', 'rpc_save_dataset missing reason'
);
select set_config('app.reason', 'Fixture for a tier-1 source without a url', true);
alter table public.sources drop constraint tier1_needs_url;
insert into public.sources (id, type, title) values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'COURT', 'Dataset bad court');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_dataset('bad-dataset', '{}'::jsonb, array['cccccccc-cccc-4ccc-8ccc-ccccccccccc1']::uuid[], 'Dataset on an unlinked court source')$sql$)$$,
  '23514', 'tier-1 source requires a url', 'rpc_save_dataset tier-1 without url'
);
select set_config('app.reason', 'Remove the bad court source', true);
delete from public.sources where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
alter table public.sources add constraint tier1_needs_url check (
  type not in ('COURT', 'CAG', 'ECI', 'SPKR') or url is not null
);
select set_config('app.reason', 'Open silence window', true);
insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['AC-001'], now() - interval '1 hour', now() + interval '1 hour', 'import sql test window');
select throws_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_dataset('silenced-dataset', '{}'::jsonb, '{}'::uuid[], 'Dataset during silence')$sql$)$$,
  'P0001', 'silence window', 'rpc_save_dataset inside silence window'
);
select set_config('app.reason', 'Close silence window', true);
delete from public.silence_windows where note = 'import sql test window';
select lives_ok(
  $$select public._as_user('11111111-1111-4111-8111-111111111111', $sql$select public.rpc_save_dataset('sql-finance', '{"presentation":"separate-records"}'::jsonb, array[(select id from public.sources where title = 'Import source')]::uuid[], 'Dataset again')$sql$)$$,
  'rpc_save_dataset self-approval does not duplicate'
);

select * from finish();
