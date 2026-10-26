-- SQL tests for phase 7 affidavit staging and constituency reservation.
-- Run with: supabase test db
-- Each file is one transaction. Fixtures roll back.
-- Do not run this against the compiled edition unless the runner rolls back.

begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(48);

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

create or replace function public._as_user_uuid(p_uid uuid, p_sql text)
returns uuid
language plpgsql
as $$
declare
  v_result uuid;
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

create or replace function public._p7_stage_sql(
  p_year integer,
  p_assets bigint,
  p_file text,
  p_url text,
  p_page integer,
  p_reason text,
  p_name text
) returns text
language sql
as $$
  select format(
    'select public.rpc_stage_affidavit(%L, %L, %L, null, %L, %s, %s, %s, %s, %s, %L, %s, %L, %L)',
    'p7-open',
    p_name,
    'BJP',
    'Assembly',
    p_year,
    p_assets,
    40,
    2,
    1,
    p_url,
    coalesce(p_page::text, 'null'),
    p_file,
    p_reason
  );
$$;

select set_config('app.reason', 'Phase 7 test fixture', true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'editor-p7@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'reviewer-p7@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'outsider-p7@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into public.staff (user_id, role, display_name) values
  ('11111111-1111-4111-8111-111111111111', 'editor', 'Editor'),
  ('22222222-2222-4222-8222-222222222222', 'reviewer', 'Reviewer');

insert into public.constituencies (id, kind, number, name) values
  ('p7-open', 'AC', 72, 'Phase 7 open seat');

insert into public.people (id, slug, name, constituency_id) values
  ('55555555-5555-4555-8555-555555555555', 'phase-seven-person', 'Phase Seven Person', 'p7-open');

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p7_stage_sql(2023, 100, repeat('ab', 32), 'https://eci.gov.in/p7-affidavit.pdf', 4, '', 'Phase Seven Person')
  ),
  'P0001',
  'reason required',
  'rpc_stage_affidavit missing reason'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p7_stage_sql(2023, 100, repeat('ab', 32), '', 4, 'Stage without a url', 'Phase Seven Person')
  ),
  '23514',
  'tier-1 source requires a url',
  'rpc_stage_affidavit tier-1 without url'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p7_stage_sql(2023, 100, repeat('ab', 32), 'https://eci.gov.in/p7-affidavit.pdf', null, 'Stage without a page', 'Phase Seven Person')
  ),
  'P0001',
  'page number required',
  'rpc_stage_affidavit rejects a row without a page'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p7_stage_sql(2023, 100, repeat('ab', 32), 'https://eci.gov.in/p7-affidavit.pdf', 4, 'Stage a phone number', 'Phase Seven 9000000000')
  ),
  'P0001',
  'personal data',
  'rpc_stage_affidavit personal data is rejected'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    public._p7_stage_sql(2023, 100, repeat('ab', 32), 'https://eci.gov.in/p7-affidavit.pdf', 4, 'Reviewer stage', 'Phase Seven Person')
  ),
  '42501',
  'forbidden role',
  'rpc_stage_affidavit forbidden role'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p7_stage_sql(2023, 100, repeat('ab', 32), 'https://eci.gov.in/p7-affidavit.pdf', 4, 'Stage the 2023 affidavit', 'Phase Seven Person')
  ),
  'rpc_stage_affidavit allowed role'
);

select is(
  (select count(*) from public.affidavit_stage where person_name = 'Phase Seven Person' and year = 2023),
  1::bigint,
  'rpc_stage_affidavit stores one staged row'
);

select is(
  (select count(*) from public.affidavits),
  0::bigint,
  'rpc_stage_affidavit self-approval does not publish the affidavit'
);

select is(
  public._as_user_uuid(
    '11111111-1111-4111-8111-111111111111',
    public._p7_stage_sql(2023, 100, repeat('ab', 32), 'https://eci.gov.in/p7-affidavit.pdf', 4, 'Stage the 2023 affidavit again', 'Phase Seven Person')
  ),
  (select id from public.affidavit_stage where person_name = 'Phase Seven Person' and year = 2023),
  'rpc_stage_affidavit idempotent second import'
);

select is(
  (select count(*) from public.affidavit_stage where person_name = 'Phase Seven Person' and year = 2023),
  1::bigint,
  'rpc_stage_affidavit idempotent second import does not add a row'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_confirm_affidavit((select id from public.affidavit_stage where year = 2023), 'Editor confirms own row')$$
  ),
  'P0001',
  'self-approval',
  'rpc_confirm_affidavit self-approval'
);

select is(
  (select count(*) from public.affidavits),
  0::bigint,
  'rpc_confirm_affidavit self-approval leaves the affidavit unpublished'
);

insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['p7-open'], now() - interval '1 hour', now() + interval '2 hours', 'Phase 7 window');

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p7_stage_sql(2024, 150, repeat('ab', 32), 'https://eci.gov.in/p7-affidavit.pdf', 9, 'Stage during silence', 'Phase Seven Person')
  ),
  'P0001',
  'silence window',
  'rpc_stage_affidavit inside silence window'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_confirm_affidavit((select id from public.affidavit_stage where year = 2023), 'Confirm during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_confirm_affidavit inside silence window'
);

delete from public.silence_windows where note = 'Phase 7 window';

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_confirm_affidavit((select id from public.affidavit_stage where year = 2023), '   ')$$
  ),
  'P0001',
  'reason required',
  'rpc_confirm_affidavit missing reason'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '44444444-4444-4444-8444-444444444444',
    $$select public.rpc_confirm_affidavit((select id from public.affidavit_stage where year = 2023), 'Outsider confirm')$$
  ),
  '42501',
  'forbidden role',
  'rpc_confirm_affidavit forbidden role'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_confirm_affidavit((select id from public.affidavit_stage where year = 2023), 'Confirm the 2023 affidavit')$$
  ),
  'rpc_confirm_affidavit allowed role'
);

select is(
  (select count(*) from public.affidavits),
  1::bigint,
  'rpc_confirm_affidavit publishes one affidavit'
);

select is(
  (select page_number from public.v_affidavits where year = 2023),
  4,
  'rpc_confirm_affidavit keeps the page number'
);

select is(
  (select source_url from public.v_affidavits where year = 2023),
  'https://eci.gov.in/p7-affidavit.pdf',
  'rpc_confirm_affidavit tier-1 without url is not how a row is published'
);

select ok(
  (select party_id is null from public.people where slug = 'phase-seven-person'),
  'rpc_confirm_affidavit does not fill a party name'
);

select is(
  (select count(*) from public.affidavit_changes),
  0::bigint,
  'rpc_confirm_affidavit does not store a single-affidavit change'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p7_stage_sql(2024, 150, repeat('ab', 32), 'https://eci.gov.in/p7-affidavit.pdf', 9, 'Stage the 2024 affidavit', 'Phase Seven Person')
  ),
  'rpc_stage_affidavit stages the second affidavit in the same file'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_confirm_affidavit((select id from public.affidavit_stage where year = 2024), 'Confirm the 2024 affidavit')$$
  ),
  'rpc_confirm_affidavit confirms the second affidavit'
);

select is(
  (select label from public.v_affidavit_changes),
  'Calculated by Praja Ledger',
  'rpc_confirm_affidavit labels the change as calculated by Praja Ledger'
);

select is(
  (select assets_delta_inr from public.affidavit_changes),
  50::bigint,
  'rpc_confirm_affidavit stores the difference between the two affidavits'
);

select is(
  (select count(*) from public.affidavit_changes),
  1::bigint,
  'rpc_confirm_affidavit stores one change for the pair'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_confirm_affidavit((select id from public.affidavit_stage where year = 2024), 'Confirm the 2024 affidavit again')$$
  ),
  'rpc_confirm_affidavit idempotent second confirm'
);

select is(
  (select count(*) from public.affidavits where year = 2024),
  1::bigint,
  'rpc_confirm_affidavit idempotent second confirm does not add an affidavit'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p7_stage_sql(2018, 80, repeat('cd', 32), 'https://eci.gov.in/p7-other.pdf', 2, 'Stage a different file', 'Phase Seven Person')
  ),
  'rpc_stage_affidavit stages a different file'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_confirm_affidavit((select id from public.affidavit_stage where year = 2018), 'Confirm the other file')$$
  ),
  'rpc_confirm_affidavit confirms a file that has one affidavit'
);

select is(
  (select count(*) from public.affidavit_changes),
  1::bigint,
  'rpc_confirm_affidavit does not pair affidavits from different files'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_set_constituency_reservation('p7-open', 'SC', '')$$
  ),
  'P0001',
  'reason required',
  'rpc_set_constituency_reservation missing reason'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    $$select public.rpc_set_constituency_reservation('p7-open', 'SC', 'Reviewer reservation')$$
  ),
  '42501',
  'forbidden role',
  'rpc_set_constituency_reservation forbidden role'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_set_constituency_reservation('p7-open', 'OBC', 'Caste category')$$
  ),
  'P0001',
  'invalid reservation',
  'rpc_set_constituency_reservation rejects a category that is not General, SC, or ST'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_set_constituency_reservation('p7-open', 'SC', 'Record the seat reservation')$$
  ),
  'rpc_set_constituency_reservation allowed role'
);

select is(
  (select reservation_category from public.constituencies where id = 'p7-open'),
  'SC',
  'rpc_set_constituency_reservation stores the category on the constituency'
);

select has_column('public', 'constituencies', 'reservation_category', 'reservation category is a constituency column');
select hasnt_column('public', 'people', 'reservation_category', 'reservation category is not a person column');
select hasnt_column('public', 'affidavits', 'reservation_category', 'reservation category is not an affidavit column');

select is(
  (select count(*) from public.sources where url is null and type = 'ECI'),
  0::bigint,
  'rpc_set_constituency_reservation tier-1 without url does not write a source'
);

insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['p7-open'], now() - interval '1 hour', now() + interval '2 hours', 'Phase 7 reservation window');

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    $$select public.rpc_set_constituency_reservation('p7-open', 'ST', 'Reservation during silence')$$
  ),
  'P0001',
  'silence window',
  'rpc_set_constituency_reservation inside silence window'
);

delete from public.silence_windows where note = 'Phase 7 reservation window';

select is(
  (select count(*) from public.affidavits),
  3::bigint,
  'rpc_set_constituency_reservation self-approval does not publish an affidavit'
);

select throws_ok(
  $$delete from public.affidavits$$,
  'P0001',
  'published content cannot be deleted',
  'published affidavits are not deleted'
);

set role anon;
select throws_ok(
  $$select person_name from public.affidavit_stage$$,
  '42501',
  'permission denied for table affidavit_stage',
  'anon cannot read staged affidavits'
);
select lives_ok(
  $$select source_url, page_number from public.v_affidavits$$,
  'anon can read a published affidavit'
);
select throws_ok(
  $$select person_name from public.v_editor_affidavit_stage$$,
  '42501',
  'permission denied for view v_editor_affidavit_stage',
  'anon cannot read the editor queue'
);
reset role;

select is(
  (
    select count(*)::int
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('v_affidavits', 'v_affidavit_changes', 'v_editor_affidavit_stage', 'v_constituencies')
      and column_name in (
        'contact_email', 'address', 'phone', 'phone_number', 'aadhaar', 'pan', 'bank',
        'religion', 'caste', 'health', 'marriage'
      )
  ),
  0,
  'affidavit views omit personal-data columns'
);

select * from finish();
rollback;
