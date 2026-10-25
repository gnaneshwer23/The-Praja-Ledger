# Praja Ledger

Public register of Telangana leaders. The spec is `docs/PRD.md`. Build it one phase at a time.

Phase 0 is the skeleton: Next.js, Tailwind, next-intl (`/en` and `/te`), Zod, Vitest, Playwright, and a local Supabase folder. No records are loaded.

The earlier visual prototype is kept in `prototype/` for the Phase 3 design port. It is not served.

`supabase/seed/register.json` is not in the repo yet. Export it from the Claude register’s “How we record” page before Phase 2.

```bash
npm run dev
npm test
npm run build
```
