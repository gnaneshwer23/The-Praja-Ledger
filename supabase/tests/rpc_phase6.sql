-- SQL tests for the phase 6 snapshot hash chain.
-- Run with: supabase test db
-- Each file is one transaction. Fixtures roll back.
-- Do not run this against the compiled edition unless the runner rolls back.

begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(16);

select set_config('app.reason', 'Phase 6 test fixture', true);

select throws_ok(
  $$select public.rpc_record_snapshot('snapshots/2026-10-26.json', repeat('11', 32), '')$$,
  'P0001',
  'reason required',
  'rpc_record_snapshot missing reason'
);

select throws_ok(
  $$select public.rpc_record_snapshot('snapshots/2026-10-26.json', 'not-a-hash', 'Bad hash')$$,
  'P0001',
  'snapshot hash refused',
  'rpc_record_snapshot refuses a hash that is not sha256'
);

select throws_ok(
  $$select public.rpc_record_snapshot('https://example.com/file.json', repeat('11', 32), 'Bad path')$$,
  'P0001',
  'snapshot path refused',
  'rpc_record_snapshot tier-1 without url does not accept a source url as the path'
);

select throws_ok(
  $$select public.rpc_record_snapshot('snapshots/2026-02-31.json', repeat('11', 32), 'Bad date')$$,
  'P0001',
  'snapshot path refused',
  'rpc_record_snapshot refuses a calendar date that does not exist'
);

select lives_ok(
  $$select public.rpc_record_snapshot('snapshots/2026-10-26.json', repeat('11', 32), 'Nightly hash of the public register')$$,
  'rpc_record_snapshot allowed role'
);

select is(
  (select prev_sha256 from public.snapshots where storage_path = 'snapshots/2026-10-26.json'),
  null,
  'rpc_record_snapshot leaves the first previous hash empty'
);

select is(
  (select reason from public.audit_log where table_name = 'snapshots' and reason = 'Nightly hash of the public register'),
  'Nightly hash of the public register',
  'rpc_record_snapshot writes the reason to audit_log'
);

select is(
  (select actor from public.audit_log where table_name = 'snapshots' and reason = 'Nightly hash of the public register'),
  null,
  'rpc_record_snapshot self-approval does not attribute the chain to a staff editor'
);

select lives_ok(
  $$select public.rpc_record_snapshot('snapshots/2026-10-27.json', repeat('22', 32), 'Next nightly hash')$$,
  'rpc_record_snapshot records a second day'
);

select is(
  (select prev_sha256 from public.snapshots where storage_path = 'snapshots/2026-10-27.json'),
  repeat('11', 32),
  'rpc_record_snapshot stores the previous day hash'
);

select throws_ok(
  $$select public.rpc_record_snapshot('snapshots/2026-10-26.json', repeat('33', 32), 'Duplicate day')$$,
  'P0001',
  'snapshot exists',
  'rpc_record_snapshot refuses a second file for the same day'
);

insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['p6-open'], now() - interval '1 hour', now() + interval '2 hours', 'Phase 6 window');

select lives_ok(
  $$select public.rpc_record_snapshot('snapshots/2026-10-28.json', repeat('44', 32), 'Snapshot during a silence window')$$,
  'rpc_record_snapshot inside silence window'
);

set role authenticated;
select throws_ok(
  $$select public.rpc_record_snapshot('snapshots/2026-10-29.json', repeat('55', 32), 'Editor snapshot')$$,
  '42501',
  'permission denied for function rpc_record_snapshot',
  'rpc_record_snapshot forbidden role'
);
reset role;

set role anon;
select lives_ok(
  $$select sha256, prev_sha256 from public.v_snapshots$$,
  'anon can read snapshot hashes'
);
select throws_ok(
  $$select sha256 from public.snapshots$$,
  '42501',
  'permission denied for table snapshots',
  'anon cannot read the snapshots table'
);
reset role;

select is(
  (
    select count(*)::int
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'v_people', 'v_entries', 'v_cases', 'v_promises', 'v_changelog', 'v_sources',
        'v_parties', 'v_constituencies', 'v_case_stages', 'v_datasets', 'v_replies', 'v_snapshots'
      )
      and column_name in (
        'contact_email', 'office_email', 'ip_hash', 'address', 'phone', 'phone_number',
        'family', 'family_details', 'before', 'after'
      )
  ),
  0,
  'public views omit private fields and audit payloads'
);

select * from finish();
rollback;
