# Seed

This directory does not contain the Claude register export. `register.json` is still missing, so the 27 people, 9 cases, and 24 promises from that export are not loaded.

`scripts/import-compiled-edition.ts` loads the edition already compiled in `src/data` (leaders, ledger entries, manifesto promises, and constituency rows) through the `rpc_*` functions. It does not invent rows to reach the export’s counts. Affidavit totals, K. Kavitha’s party name, unlinked court-order PDFs, the current Cheyutha monthly amount, and manifesto quotes that are not compiled yet are left out.

Run it only against a database that already has the Phase 1 migrations:

```bash
npx tsx scripts/import-compiled-edition.ts
```

The script reads `DATABASE_URL` from the environment or from `.env.local`. That value is the database owner connection and must not be exposed to the browser.
