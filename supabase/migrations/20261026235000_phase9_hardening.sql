-- Phase 9. The public banner reads live silence windows. Staff notes stay off the view.
-- A publish for a constituency inside an open window is still refused.

create or replace view public.v_live_silence
with (security_barrier = true, security_invoker = false) as
select
  id,
  constituency_ids,
  starts_at,
  ends_at
from public.silence_windows
where now() >= starts_at
  and now() < ends_at;

comment on view public.v_live_silence is
  'Constituencies where publishing is paused. The staff note is not selected.';

revoke all on public.v_live_silence from public;
grant select on public.v_live_silence to anon, authenticated;
