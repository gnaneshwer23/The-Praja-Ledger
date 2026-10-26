# Launch checklist

These items stay open. This list does not record a legal sign-off, a publisher of record, a domain, or a Telugu review. The editor console shows the same lines and reads only whether a database connection and a nightly-job secret are configured. It does not print those values.

- [ ] Point-in-time recovery is on, and nightly snapshots are kept for 2 years
- [ ] MFA is on for every staff account
- [ ] RLS tests are recorded as passed
- [ ] Legal review signed off
- [ ] Publisher of record named
- [ ] Public domain chosen
- [ ] Telugu review finished
- [ ] SQL, unit, and Playwright tests pass in CI

Phase 9 acceptance that is still open:

- [ ] Inside a silence window, every publish for that constituency is refused with a clear message
- [ ] All SQL, unit and Playwright tests pass in CI
- [ ] Legal review signed off

The silence refusal is implemented in `rpc_*` and covered by `supabase/tests/rpc_phase9.sql` plus the earlier phase tests. Those SQL tests were not run against the compiled edition because the database owner login was rejected. Playwright was not executed in this pass. `.github/workflows/ci.yml` runs the TypeScript check and the unit tests on push and pull request. It does not install Playwright browsers, and it does not run the SQL tests. The CI lines stay open until a recorded run passes those tests.
