-- SQL tests for phase 8 Telugu staging and approval.
-- Run with: supabase test db
-- Each file is one transaction. Fixtures roll back.
-- Do not run this against the compiled edition. It inserts staff and rolls back only
-- when the runner wraps the file in a transaction.

begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(31);

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

create or replace function public._as_user_text(p_uid uuid, p_sql text)
returns text
language plpgsql
as $$
declare
  v_result text;
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

create or replace function public._p8_stage_sql(
  p_kind text,
  p_key text,
  p_field text,
  p_telugu text,
  p_reason text
) returns text
language sql
as $$
  select format(
    'select public.rpc_stage_translation(%L, %L, %L, %L, %L)',
    p_kind,
    p_key,
    p_field,
    p_telugu,
    p_reason
  );
$$;

select set_config('app.reason', 'Phase 8 test fixture', true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'editor-p8@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'reviewer-p8@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'admin-p8@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'outsider-p8@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into public.staff (user_id, role, display_name) values
  ('11111111-1111-4111-8111-111111111111', 'editor', 'Editor'),
  ('22222222-2222-4222-8222-222222222222', 'reviewer', 'Reviewer'),
  ('33333333-3333-4333-8333-333333333333', 'admin', 'Admin');

insert into public.constituencies (id, kind, number, name) values
  ('p8-open', 'AC', 80, 'Phase 8 open seat');

insert into public.people (id, slug, name, constituency_id) values
  ('55555555-5555-4555-8555-555555555558', 'p8-person', 'Phase Eight Person', 'p8-open');

insert into public.cases (id, slug, title, summary) values
  ('66666666-6666-4666-8666-666666666668', 'PL-C-P8', 'Phase 8 case', 'The stage is chargesheet.');

insert into public.promises (manifesto, body, external_id) values
  ('phase-8', 'A sourced promise line.', 'p8:one');

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p8_stage_sql('person', 'p8-person', 'name_te', 'దశ ఎనిమిది', '')
  ),
  'P0001',
  'reason required',
  'rpc_stage_translation missing reason'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p8_stage_sql('person', 'p8-person', 'name_te', '', 'Stage an empty line')
  ),
  'P0001',
  'telugu required',
  'rpc_stage_translation rejects empty Telugu'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p8_stage_sql('person', 'p8-person', 'name_te', '   ', 'Stage a blank line')
  ),
  'P0001',
  'telugu required',
  'rpc_stage_translation rejects blank Telugu'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    public._p8_stage_sql('person', 'p8-person', 'name_te', 'దశ ఎనిమిది', 'Reviewer stages a name')
  ),
  '42501',
  'forbidden role',
  'rpc_stage_translation forbidden role'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '44444444-4444-4444-8444-444444444444',
    public._p8_stage_sql('person', 'p8-person', 'name_te', 'దశ ఎనిమిది', 'Outsider stages a name')
  ),
  '42501',
  'forbidden role',
  'rpc_stage_translation outsider is forbidden'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p8_stage_sql('person', 'p8-person', 'name_te', 'called corrupt', 'Stage a name')
  ),
  'P0001',
  'blocked wording',
  'rpc_stage_translation blocks corrupt, guilty, and criminal'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p8_stage_sql('person', 'p8-person', 'name_te', '9000000000', 'Stage a phone')
  ),
  'P0001',
  'personal data',
  'rpc_stage_translation rejects personal data'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p8_stage_sql('person', 'p8-person', 'name_te', 'దశ ఎనిమిది', 'Stage the Telugu name')
  ),
  'rpc_stage_translation allowed role'
);

select is(
  (select name_te from public.people where slug = 'p8-person'),
  null,
  'rpc_stage_translation does not publish the name'
);

select is(
  (select count(*) from public.translation_stage where entity_key = 'p8-person' and status = 'staged'),
  1::bigint,
  'rpc_stage_translation keeps one staged row'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    format(
      'select public.rpc_approve_translation(%L, %L)',
      (select id from public.translation_stage where entity_key = 'p8-person'),
      'Editor approves own line'
    )
  ),
  'P0001',
  'self-approval',
  'rpc_approve_translation self-approval'
);

select is(
  (select name_te from public.people where slug = 'p8-person'),
  null,
  'rpc_approve_translation self-approval leaves the name unpublished'
);

insert into public.silence_windows (constituency_ids, starts_at, ends_at, note)
values (array['p8-open'], now() - interval '1 hour', now() + interval '2 hours', 'Phase 8 window');

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p8_stage_sql('promise', 'p8:one', 'body_te', 'హామీ వరుస', 'Stage during silence')
  ),
  'P0001',
  'silence window',
  'rpc_stage_translation inside silence window'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    format(
      'select public.rpc_approve_translation(%L, %L)',
      (select id from public.translation_stage where entity_key = 'p8-person'),
      'Approve during silence'
    )
  ),
  'P0001',
  'silence window',
  'rpc_approve_translation inside silence window'
);

delete from public.silence_windows where note = 'Phase 8 window';

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    format(
      'select public.rpc_approve_translation(%L, %L)',
      (select id from public.translation_stage where entity_key = 'p8-person'),
      '   '
    )
  ),
  'P0001',
  'reason required',
  'rpc_approve_translation missing reason'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '44444444-4444-4444-8444-444444444444',
    format(
      'select public.rpc_approve_translation(%L, %L)',
      (select id from public.translation_stage where entity_key = 'p8-person'),
      'Outsider approves'
    )
  ),
  '42501',
  'forbidden role',
  'rpc_approve_translation forbidden role'
);

create temp table _p8_payload (label text primary key, payload jsonb);

insert into _p8_payload (label, payload)
select 'person', (public._as_user_text(
  '22222222-2222-4222-8222-222222222222',
  format(
    'select public.rpc_approve_translation(%L, %L)::text',
    (select id from public.translation_stage where entity_key = 'p8-person'),
    'Approve the Telugu name'
  )
))::jsonb;

select is(
  (select payload ->> 'public_changed' from _p8_payload where label = 'person'),
  'true',
  'rpc_approve_translation publishes a changed name'
);

select is(
  (select name_te from public.people where slug = 'p8-person'),
  'దశ ఎనిమిది',
  'rpc_approve_translation writes the Telugu name'
);

select is(
  (select status from public.translation_stage where entity_key = 'p8-person'),
  'approved',
  'rpc_approve_translation marks the line approved'
);

select is(
  (
    select approved_by is distinct from created_by
    from public.translation_stage
    where entity_key = 'p8-person'
  ),
  true,
  'rpc_approve_translation keeps the approver different'
);

insert into _p8_payload (label, payload)
select 'person-again', (public._as_user_text(
  '33333333-3333-4333-8333-333333333333',
  format(
    'select public.rpc_approve_translation(%L, %L)::text',
    (select id from public.translation_stage where entity_key = 'p8-person'),
    'Approve the same line again'
  )
))::jsonb;

select is(
  (select payload ->> 'public_changed' from _p8_payload where label = 'person-again'),
  'false',
  'rpc_approve_translation does not publish an unchanged line again'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p8_stage_sql('case', 'PL-C-P8', 'title_te', 'దశ ఎనిమిది కేసు', 'Stage the case title')
  ),
  'rpc_stage_translation stages a case title'
);

insert into _p8_payload (label, payload)
select 'case', (public._as_user_text(
  '22222222-2222-4222-8222-222222222222',
  format(
    'select public.rpc_approve_translation(%L, %L)::text',
    (select id from public.translation_stage where entity_key = 'PL-C-P8'),
    'Approve the case title'
  )
))::jsonb;

select is(
  (select title_te from public.cases where slug = 'PL-C-P8'),
  'దశ ఎనిమిది కేసు',
  'rpc_approve_translation writes the case title'
);

select is(
  (select payload ->> 'public_changed' from _p8_payload where label = 'case'),
  'true',
  'rpc_approve_translation reports a public case change'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p8_stage_sql('message', 'Admin.title', 'text', 'శీర్షిక', 'Stage a chrome line')
  ),
  'rpc_stage_translation stages a message line'
);

insert into _p8_payload (label, payload)
select 'message', (public._as_user_text(
  '22222222-2222-4222-8222-222222222222',
  format(
    'select public.rpc_approve_translation(%L, %L)::text',
    (select id from public.translation_stage where kind = 'message'),
    'Approve the chrome line'
  )
))::jsonb;

select is(
  (select payload ->> 'public_changed' from _p8_payload where label = 'message'),
  'false',
  'rpc_approve_translation does not treat a message line as a public record change'
);

select is(
  (select name_te from public.people where slug = 'p8-person'),
  'దశ ఎనిమిది',
  'rpc_approve_translation leaves the person name in place'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    public._p8_stage_sql('promise', 'p8:one', 'body_te', 'హామీ వరుస', 'Stage the promise')
  ),
  'rpc_stage_translation stages a promise'
);

select throws_ok(
  format(
    'select public._as_user(%L, %L)',
    '33333333-3333-4333-8333-333333333333',
    public._p8_stage_sql('promise', 'p8:one', 'body_te', 'వేరే వరుస', 'Stage the same promise')
  ),
  'P0001',
  'already staged',
  'rpc_stage_translation rejects a second person staging the same line'
);

select lives_ok(
  format(
    'select public._as_user(%L, %L)',
    '22222222-2222-4222-8222-222222222222',
    format(
      'select public.rpc_approve_translation(%L, %L)',
      (select id from public.translation_stage where entity_key = 'p8:one'),
      'Approve the promise'
    )
  ),
  'rpc_approve_translation approves a promise without a public page refresh flag'
);

select is(
  (select body_te from public.promises where external_id = 'p8:one'),
  'హామీ వరుస',
  'rpc_approve_translation writes the promise Telugu'
);

select * from finish();

rollback;
