-- SQL tests for phase 5 corrections and replies.
-- Run with: supabase test db
-- Each file is one transaction. Fixtures roll back.
-- Do not run this against the compiled edition unless the runner rolls back.

begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(50);

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

select set_config('app.reason', 'Phase 5 test fixture', true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '15151515-1515-4515-8515-151515151515', 'authenticated', 'authenticated', 'editor-p5@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '25252525-2525-4525-8525-252525252525', 'authenticated', 'authenticated', 'reviewer-p5@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '35353535-3535-4535-8535-353535353535', 'authenticated', 'authenticated', 'admin-p5@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '45454545-4545-4545-8545-454545454545', 'authenticated', 'authenticated', 'outsider-p5@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into public.staff (user_id, role, display_name) values
  ('15151515-1515-4515-8515-151515151515', 'editor', 'Editor'),
  ('25252525-2525-4525-8525-252525252525', 'reviewer', 'Reviewer'),
  ('35353535-3535-4535-8535-353535353535', 'admin', 'Admin');

insert into public.constituencies (id, kind, number, name) values
  ('p5-open', 'AC', 98, 'Phase 5 open seat');
insert into public.people (id, slug, name, constituency_id) values
  ('55555555-5555-4555-8555-555555555505', 'phase5-person', 'Phase 5 person', 'p5-open');
insert into public.sources (type, url, title, publisher, published_on, created_by) values
  ('MEDIA', 'https://example.com/phase5-source', 'Phase 5 source', 'Example paper', '2026-10-25', '15151515-1515-4515-8515-151515151515');
insert into public.entries (
  person_id, kind, body, source_id, verify, status, created_by, approved_by, external_id, title, section
) values (
  '55555555-5555-4555-8555-555555555505',
  'work',
  'Phase 5 published line',
  (select id from public.sources where title = 'Phase 5 source'),
  false,
  'published',
  '15151515-1515-4515-8515-151515151515',
  '15151515-1515-4515-8515-151515151515',
  'PL-P5-1',
  'Phase 5 line',
  'cases'
);
insert into public.cases (id, slug, title) values
  ('88888888-8888-4888-8888-888888888805', 'phase5-case', 'Phase 5 case');
insert into public.case_events (
  case_id, stage_idx, event_date, note, source_id, status, created_by, approved_by
) values (
  '88888888-8888-4888-8888-888888888805',
  0,
  '2026-10-01',
  'Phase 5 case event',
  (select id from public.sources where title = 'Phase 5 source'),
  'published',
  '15151515-1515-4515-8515-151515151515',
  '25252525-2525-4525-8525-252525252525'
);
insert into public.promises (manifesto, body, external_id, title) values
  ('Phase 5 manifesto', 'A promise line for the phase 5 test', 'p5-promise', 'Phase 5 promise');
insert into public.promise_updates (promise_id, status, detail, source_id, verify, created_by) values (
  (select id from public.promises where external_id = 'p5-promise'),
  'progress',
  'Phase 5 promise update',
  (select id from public.sources where title = 'Phase 5 source'),
  true,
  '15151515-1515-4515-8515-151515151515'
);

-- rpc_submit_correction
select lives_ok(
  $$select public.rpc_submit_correction(
    'entry', 'PL-P5-1', 'The date in the line is wrong', 'https://example.com/phase5-doc',
    'reader@example.com', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'The date in the line is wrong'
  )$$,
  'rpc_submit_correction allowed for the database owner without a staff session'
);
select is(
  (select status from public.corrections where body = 'The date in the line is wrong'),
  'open',
  'a public correction lands open'
);
select is(
  (select contact_email from public.corrections where body = 'The date in the line is wrong'),
  'reader@example.com',
  'contact email is stored on the row'
);
select ok(
  (
    select not (after ? 'contact_email')
    from public.audit_log
    where reason = 'The date in the line is wrong' and table_name = 'corrections'
    order by id desc
    limit 1
  ),
  'audit payload omits the contact email'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and column_name in ('contact_email', 'office_email')
      and table_name in (
        'v_replies', 'v_editor_corrections', 'v_editor_replies', 'v_editor_changes',
        'v_editor_open_corrections', 'v_people', 'v_entries', 'v_cases', 'v_promises', 'v_changelog'
      )
  ),
  'public and staff views do not select contact emails'
);
select throws_ok(
  $$select public.rpc_submit_correction(
    'entry', 'PL-P5-1', 'Missing reason', null, null,
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', ''
  )$$,
  'P0001',
  'reason required',
  'rpc_submit_correction missing reason'
);
select throws_ok(
  $$select public.rpc_submit_correction(
    'entry', 'PL-P5-1', 'Bad hash', null, null, 'not-a-hash', 'Bad hash'
  )$$,
  'P0001',
  'ip hash required',
  'rpc_submit_correction rejects a raw address'
);
select throws_ok(
  $$select public.rpc_submit_correction(
    'entry', 'PL-P5-1', 'Bad url', 'http://example.com/doc', null,
    'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', 'Bad url'
  )$$,
  'P0001',
  'https url required',
  'rpc_submit_correction rejects a non-https source'
);
select throws_ok(
  $$select public.rpc_submit_correction(
    'entry', 'missing-record', 'No such line', null, null,
    'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', 'No such line'
  )$$,
  'P0001',
  'record not found',
  'rpc_submit_correction rejects an unknown record'
);
select lives_ok(
  $$select public.rpc_submit_correction('case', 'phase5-case', 'Case line', null, null, 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'Case line')$$,
  'rpc_submit_correction accepts a published case'
);
select lives_ok(
  $$select public.rpc_submit_correction('promise', 'p5-promise', 'Promise line', null, null, 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 'Promise line')$$,
  'rpc_submit_correction accepts a promise'
);

select lives_ok(
  $$select public.rpc_submit_correction('entry', 'PL-P5-1', 'Rate 1', null, null, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Rate 1')$$,
  'rate limit slot 1'
);
select lives_ok(
  $$select public.rpc_submit_correction('entry', 'PL-P5-1', 'Rate 2', null, null, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Rate 2')$$,
  'rate limit slot 2'
);
select lives_ok(
  $$select public.rpc_submit_correction('entry', 'PL-P5-1', 'Rate 3', null, null, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Rate 3')$$,
  'rate limit slot 3'
);
select lives_ok(
  $$select public.rpc_submit_correction('entry', 'PL-P5-1', 'Rate 4', null, null, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Rate 4')$$,
  'rate limit slot 4'
);
select lives_ok(
  $$select public.rpc_submit_correction('entry', 'PL-P5-1', 'Rate 5', null, null, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Rate 5')$$,
  'rate limit slot 5'
);
select throws_ok(
  $$select public.rpc_submit_correction('entry', 'PL-P5-1', 'Rate 6', null, null, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Rate 6')$$,
  'P0001',
  'rate limit',
  'rpc_submit_correction allows 5 submissions an hour from one address hash'
);

set role authenticated;
select throws_ok(
  $$select public.rpc_submit_correction(
    'entry', 'PL-P5-1', 'Direct call', null, null,
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'Direct call'
  )$$,
  '42501',
  'permission denied for function rpc_submit_correction',
  'authenticated cannot submit a correction directly'
);
reset role;

set role anon;
select throws_ok(
  'select contact_email from public.corrections',
  '42501',
  'permission denied for table corrections',
  'anon cannot read correction emails'
);
select throws_ok(
  'select office_email from public.replies',
  '42501',
  'permission denied for table replies',
  'anon cannot read reply emails'
);
reset role;

-- triage
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '15151515-1515-4515-8515-151515151515',
    $$select public.rpc_apply_correction((select id from public.corrections where body = 'The date in the line is wrong'), 1, 'Editor note', 'Editor note')$$
  ),
  '42501',
  'forbidden role',
  'rpc_apply_correction forbidden role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '25252525-2525-4525-8525-252525252525',
    $$select public.rpc_apply_correction((select id from public.corrections where body = 'The date in the line is wrong'), (select id from public.audit_log where reason = 'The date in the line is wrong' order by id desc limit 1), 'Linked', '')$$
  ),
  'P0001',
  'reason required',
  'rpc_apply_correction missing reason'
);
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '25252525-2525-4525-8525-252525252525',
    $$select public.rpc_apply_correction((select id from public.corrections where body = 'The date in the line is wrong'), (select id from public.audit_log where reason = 'The date in the line is wrong' order by id desc limit 1), 'Linked to the fixing change', 'Linked to the fixing change')$$
  ),
  'rpc_apply_correction allowed role'
);
select is(
  (select status from public.corrections where body = 'The date in the line is wrong'),
  'applied',
  'rpc_apply_correction links the correction to a change'
);
select ok(
  exists (
    select 1 from public.audit_log
    where reason = 'Linked to the fixing change' and table_name = 'corrections' and action = 'update'
  ),
  'rpc_apply_correction writes the reason to audit_log'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '25252525-2525-4525-8525-252525252525',
    $$select public.rpc_decline_correction((select id from public.corrections where body = 'Case line'), '', 'Decline the case line')$$
  ),
  'P0001',
  'reason required',
  'rpc_decline_correction missing note'
);
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '25252525-2525-4525-8525-252525252525',
    $$select public.rpc_decline_correction((select id from public.corrections where body = 'Case line'), 'The case line matches the record', 'The case line matches the record')$$
  ),
  'rpc_decline_correction allowed role'
);
select ok(
  exists (
    select 1 from public.audit_log
    where reason = 'The case line matches the record' and table_name = 'corrections'
  ),
  'rpc_decline_correction writes the reason to audit_log'
);

-- replies
select lives_ok(
  $$select public.rpc_submit_reply(
    'PL-P5-1', 'Phase 5 office', 'The office reply stays as submitted.',
    'office@example.com', '9999999999999999999999999999999999999999999999999999999999999999',
    'The office reply stays as submitted.'
  )$$,
  'rpc_submit_reply allowed for the database owner'
);
select is(
  (select count(*) from public.v_replies where external_id = 'PL-P5-1'),
  0::bigint,
  'an unchecked reply stays off the public view'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '15151515-1515-4515-8515-151515151515',
    $$select public.rpc_publish_reply((select id from public.replies where office_name = 'Phase 5 office'), 'email_domain', null, null, 'Editor cannot publish')$$
  ),
  '42501',
  'forbidden role',
  'rpc_publish_reply forbidden role'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '25252525-2525-4525-8525-252525252525',
    $$select public.rpc_publish_reply((select id from public.replies where office_name = 'Phase 5 office'), 'email_domain', null, null, '')$$
  ),
  'P0001',
  'reason required',
  'rpc_publish_reply missing reason'
);
select lives_ok(
  $$select public.rpc_submit_reply(
    'PL-P5-1', 'Consumer office', 'A mailbox reply.',
    'office@gmail.com', '8888888888888888888888888888888888888888888888888888888888888888',
    'A mailbox reply.'
  )$$,
  'rpc_submit_reply stores a consumer mailbox for a later refusal'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '25252525-2525-4525-8525-252525252525',
    $$select public.rpc_publish_reply((select id from public.replies where office_name = 'Consumer office'), 'email_domain', null, null, 'Consumer domain')$$
  ),
  'P0001',
  'office domain refused',
  'rpc_publish_reply refuses a consumer mailbox domain'
);
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '25252525-2525-4525-8525-252525252525',
    $$select public.rpc_publish_reply((select id from public.replies where office_name = 'Phase 5 office'), 'signed_letter', 'replies/not-a-hash.pdf', 'not-a-hash', 'Bad letter')$$
  ),
  'P0001',
  'signed letter required',
  'rpc_publish_reply requires a stored letter'
);
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '25252525-2525-4525-8525-252525252525',
    $$select public.rpc_publish_reply((select id from public.replies where office_name = 'Phase 5 office'), 'email_domain', null, null, 'Publish the office reply')$$
  ),
  'rpc_publish_reply allowed role'
);
select is(
  (select body from public.replies where office_name = 'Phase 5 office'),
  'The office reply stays as submitted.',
  'rpc_publish_reply leaves the reply text unchanged'
);
select is(
  (select count(*) from public.v_replies where external_id = 'PL-P5-1'),
  1::bigint,
  'a published reply is visible without the office email'
);
select throws_ok(
  $$update public.replies set body = 'Changed by the site' where office_name = 'Phase 5 office'$$,
  'P0001',
  'reply is published unedited',
  'a published reply cannot be rewritten'
);
select throws_ok(
  $$delete from public.replies where office_name = 'Phase 5 office'$$,
  'P0001',
  'published content cannot be deleted',
  'a published reply cannot be deleted'
);

-- email purge
select lives_ok(
  $$select public.rpc_submit_correction(
    'entry', 'PL-P5-1', 'Old email', null, 'old@example.com',
    '1111111111111111111111111111111111111111111111111111111111111111', 'Old email'
  )$$,
  'fixture correction with an old email'
);
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '25252525-2525-4525-8525-252525252525',
    $$select public.rpc_decline_correction((select id from public.corrections where body = 'Old email'), 'Decided long enough ago', 'Decided long enough ago')$$
  ),
  'fixture decision for the email purge'
);
select lives_ok(
  $$select public.rpc_submit_correction(
    'entry', 'PL-P5-1', 'Recent email', null, 'recent@example.com',
    '2222222222222222222222222222222222222222222222222222222222222222', 'Recent email'
  )$$,
  'fixture correction with a recent email'
);
select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '25252525-2525-4525-8525-252525252525',
    $$select public.rpc_decline_correction((select id from public.corrections where body = 'Recent email'), 'Decided recently', 'Decided recently')$$
  ),
  'fixture recent decision'
);
update public.corrections set decided_at = now() - interval '91 days' where body = 'Old email';
update public.corrections set decided_at = now() - interval '10 days' where body = 'Recent email';
select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '15151515-1515-4515-8515-151515151515',
    $$select public.rpc_purge_correction_emails('Editor purge')$$
  ),
  '42501',
  'forbidden role',
  'rpc_purge_correction_emails forbidden role'
);
select throws_ok(
  $$select public.rpc_purge_correction_emails('')$$,
  'P0001',
  'reason required',
  'rpc_purge_correction_emails missing reason'
);
select lives_ok(
  $$select public.rpc_purge_correction_emails('Null contact emails 90 days after a decision')$$,
  'rpc_purge_correction_emails allowed for the database owner'
);
select is(
  (select contact_email from public.corrections where body = 'Old email'),
  null,
  'rpc_purge_correction_emails nulls an email 90 days after the decision'
);
select is(
  (select contact_email from public.corrections where body = 'Recent email'),
  'recent@example.com',
  'rpc_purge_correction_emails keeps an email inside 90 days'
);

insert into public.corrections (entity_type, entity_id, body, status)
select 'entry', (select id from public.entries where external_id = 'PL-P5-1'), 'queued ' || g, 'open'
from generate_series(1, 2000) g;
select throws_ok(
  $$select public.rpc_submit_correction(
    'entry', 'PL-P5-1', 'One more', null, null,
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', 'One more'
  )$$,
  'P0001',
  'correction queue full',
  'rpc_submit_correction stops at 2000 open items'
);

select * from finish();
rollback;
