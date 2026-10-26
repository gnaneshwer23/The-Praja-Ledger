-- Compatibility for a Postgres host that is not Supabase.
-- Creates auth.uid() and the anon roles only when they are missing.
-- Does not replace an existing Supabase auth.uid().

create schema if not exists auth;

create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  confirmation_token text,
  email_change text,
  email_change_token_new text,
  recovery_token text
);

-- anon, authenticated, and service_role are created outside a transaction
-- when this database is not Supabase. CREATE ROLE cannot run inside a transaction.

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    execute $fn$
      create function auth.uid()
      returns uuid
      language sql
      stable
      as $body$
        select coalesce(
          nullif(current_setting('request.jwt.claim.sub', true), ''),
          nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub'
        )::uuid
      $body$
    $fn$;
  end if;
end
$$;
