# Praja Ledger — PRD and Cursor build brief

Oct 25, 2026 · @Gnaneshwer Jadav

Build Praja Ledger in ten phases, one Cursor Agent chat per phase, with this PRD and a rules file in the repo as permanent context. Don’t ask Cursor to “build the whole thing” in one prompt: it will invent a schema, skip the audit trail and quietly drop the neutrality rules.

## How to use this with Cursor

1. Create an empty Git repo named `praja-ledger` and open it in Cursor.
2. Export this doc as Markdown and save it as `docs/PRD.md`.
3. Copy the rules block from the “Cursor rules file” section into `.cursor/rules/praja-ledger.mdc`. Cursor then applies it to every chat.
4. Open the live Claude register, go to “How we record” and download the register JSON. Save it as `supabase/seed/register.json`.
5. Run the phase prompts below in order, each in a fresh Agent chat. Start every prompt by attaching `@docs/PRD.md`.
6. After each phase, run its acceptance checks yourself. Don’t start the next phase until they pass.
7. Commit after every phase so you can roll back a bad generation.

## Product summary

Praja Ledger is a public, non-partisan register of what Telangana’s elected leaders have done, promised and been accused of, with every entry tied to a source and, for legal matters, its exact stage.

**Problem.** Voters get leader information from party propaganda and partisan media. Allegations, chargesheets and convictions are reported as if they were the same thing, and debt and welfare numbers are quoted on whichever definition suits the speaker.

**Users**

| User | Needs | Access |
| --- | --- | --- |
| Voter | Check a leader or constituency quickly on a phone, in Telugu or English | Public, no login |
| Journalist or researcher | Sources, history of changes, bulk data | Public, no login; data downloads |
| Contributor | Suggest corrections with a source | Public form, no login (bot-protected) |
| Leader’s office | Publish a right of reply to an entry | Verified reply form |
| Editor | Add and update entries | Login with MFA |
| Reviewer | Approve sensitive entries, decide corrections | Login with MFA |
| Admin | Users, silence windows, settings | Login with MFA |

**Goals**

- Every published entry carries a source type, and every court, audit, affidavit or Speaker entry links to the document.
- Every party and every MLA gets the same fields and the same update rules.
- Every change is publicly logged and the history cannot be rewritten without detection.
- All 119 Assembly constituencies and 17 Lok Sabha constituencies have a page by the end of phase 7.

**Non-goals**

- No scores, rankings, report-card grades or “best candidate” recommendations.
- No opinion polls, surveys or vote-intention content.
- No public comment threads on leaders.
- No advertising, party funding or sponsored content.

**Success metrics**

| Metric | Target at public launch |
| --- | --- |
| Published entries with a primary-source link | 80% or more |
| Entries still marked Verify | Under 10% |
| Median time from correction submitted to decision | Under 72 hours |
| MLAs with a complete affidavit record | 119 of 119 |
| Largest Contentful Paint on a mid-range phone over 4G | Under 2.5 s |

## Editorial rules (enforced in code, not just policy)

These rules are requirements. Each one must be enforced by the database or the API, so a careless editor or a careless code change cannot break it.

**Source types.** Every entry, case event and promise status has exactly one source type.

| Code | Label | Tier | Rule |
| --- | --- | --- | --- |
| COURT | Court record | 1 | Link required |
| CAG | CAG audit | 1 | Link required |
| ECI | ECI affidavit | 1 | Link required |
| SPKR | Speaker ruling | 1 | Link required |
| COMM | Inquiry body | 2 | Saved as Verify unless linked |
| MEDIA | Media report | 2 | Saved as Verify unless linked |
| GOV | Government claim | 3 | Saved as Verify unless linked |
| OPP | Rival party claim | 3 | Saved as Verify unless linked |
| PARTY | Party’s own claim | 3 | Saved as Verify unless linked |

**Rules**

1. R1 Source required: no entry, case event or promise status can be published without a source type. Tier-1 types also need a URL.
2. R2 Legal stage, not adjectives: a legal matter is shown only as its stage (allegation, FIR, chargesheet, charges framed, trial, verdict, appeal or revision). Words like “corrupt”, “scam” or “guilty” are blocked in editor input unless the entry quotes a court verdict.
3. R3 Claims are labelled: tier-3 entries display as “X says…” and never in the site’s own voice.
4. R4 Two-person rule: any new “issue” entry and any case stage change needs a second person, a Reviewer, to approve it before it is published. Work entries need one editor.
5. R5 Reason required: every write carries a reason string that appears in the public change log.
6. R6 Append-only history: the audit log cannot be updated or deleted by anyone, including admins. Retracted entries stay in history, marked retracted, with a reason.
7. R7 Equal fields: every person record has the same fields. A missing value displays as “Not compiled yet”, never as blank or zero.
8. R8 Right of reply: a verified office of the leader can attach a reply to any entry about them. Replies are shown alongside the entry and are not edited by the site.
9. R9 Election silence: during a configured silence window (48 hours before polls close, Representation of the People Act Section 126), publishing is blocked for the affected constituencies and a banner explains why.
10. R10 Declared cases are not guilt: affidavit case counts always render with the sentence “Self-declared pending cases. A pending case is not a conviction.”
11. R11 No family data: no addresses, ID numbers, phone numbers or details of family members, even if they appear in an affidavit (DPDP Act 2023 data minimisation).

## Tech stack and architecture

Use Next.js on Vercel for the site and Supabase (Postgres) for data, auth and storage. All editorial writes go through Postgres functions, so the rules above live in the database, not just in the UI.

| Layer | Choice | Why |
| --- | --- | --- |
| Web framework | Next.js (App Router), TypeScript strict mode | Pre-rendered public pages for speed and search; server actions for the editor console |
| Hosting | Vercel | Incremental regeneration, cron jobs, preview deploys per branch |
| Database | Supabase Postgres | Row-level security, triggers for the audit log, point-in-time recovery |
| Auth | Supabase Auth with email magic link plus TOTP MFA | Editors only; the public never logs in |
| File storage | Supabase Storage | Archived source PDFs and nightly data snapshots |
| Validation | Zod schemas shared by forms and server actions | One definition of what a valid entry is |
| Styling | Tailwind CSS with design tokens from the current prototype | Same look as the Claude register |
| Languages | next-intl with `en` and `te` locales | Telugu first-class, not an afterthought |
| Bot protection | Cloudflare Turnstile on public forms | Corrections and replies without logins |
| Analytics | Cookieless analytics only (Vercel Web Analytics or Plausible) | No voter tracking |
| Tests | Vitest for logic, Playwright for flows, pgTAP or SQL tests for RLS | Rules are tested, not trusted |

**Write path.** Editor console → server action → Postgres function (`rpc`) that checks role, source rules and silence windows, writes the row, and sets the reason → audit trigger copies before and after into `audit_log` → the server action calls `revalidateTag` so public pages refresh within seconds.

**Read path.** Public pages read from database views that expose only published, non-retracted rows. The browser never holds a key that can write.

&#91;embedded content: System architecture · write path, history, read path\]

No arrow runs from the console straight to the tables: the rpc\_ functions are the only way in, which is what makes the audit log complete.

## Data model

History is stored as rows, not overwritten fields: case stages and promise statuses are event tables, and the current value is the latest event. Give Cursor this schema as the starting migration.

```sql
-- enums
create type source_type as enum ('COURT','CAG','ECI','SPKR','COMM','MEDIA','GOV','OPP','PARTY');
create type entry_kind as enum ('work','issue');
create type pub_status as enum ('draft','pending_review','published','retracted');
create type case_state as enum ('pending','final','unknown');
create type promise_status as enum ('delivered','partial','not','disputed','progress','unverified');
create type staff_role as enum ('editor','reviewer','admin');

create table parties (id text primary key, name text not null, name_te text);
create table constituencies (
  id text primary key,                 -- e.g. 'AC-045', 'PC-08'
  kind text not null check (kind in ('AC','PC')),
  number int not null, name text not null, name_te text, district text);

create table people (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, name_te text,
  party_id text references parties, role text, constituency_id text references constituencies,
  status_note text, created_at timestamptz default now(), updated_at timestamptz default now());

create table sources (
  id uuid primary key default gen_random_uuid(),
  type source_type not null, url text, title text, publisher text, published_on date,
  archived_path text, sha256 text,                      -- copy kept in Storage
  created_by uuid references auth.users, created_at timestamptz default now(),
  constraint tier1_needs_url check (type not in ('COURT','CAG','ECI','SPKR') or url is not null));

create table affidavits (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people not null, election text not null, year int not null,
  assets_inr bigint, liabilities_inr bigint, declared_cases int, serious_cases int,
  source_id uuid references sources not null);

create table entries (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people not null, kind entry_kind not null,
  body text not null, body_te text, source_id uuid references sources not null,
  verify boolean not null default true, status pub_status not null default 'draft',
  created_by uuid, approved_by uuid, created_at timestamptz default now(), updated_at timestamptz default now(),
  constraint four_eyes check (status <> 'published' or kind = 'work' or approved_by is distinct from created_by));

create table cases (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  title text not null, summary text, party_id text references parties, state case_state not null default 'pending');
create table case_stages (case_id uuid references cases on delete cascade, idx int, label text not null, primary key (case_id, idx));
create table case_people (case_id uuid references cases, person_id uuid references people, role_in_case text, primary key (case_id, person_id));
create table case_events (
  id uuid primary key default gen_random_uuid(), case_id uuid references cases not null,
  stage_idx int, event_date date, note text not null, source_id uuid references sources not null,
  status pub_status not null default 'pending_review', created_by uuid, approved_by uuid, created_at timestamptz default now());

create table promises (
  id uuid primary key default gen_random_uuid(), manifesto text not null, party_id text references parties,
  area text, body text not null, body_te text, sort int);
create table promise_updates (
  id uuid primary key default gen_random_uuid(), promise_id uuid references promises not null,
  status promise_status not null, detail text, source_id uuid references sources not null,
  verify boolean not null default true, created_by uuid, created_at timestamptz default now());

create table replies (            -- right of reply
  id uuid primary key default gen_random_uuid(), entry_id uuid references entries not null,
  office_name text not null, body text not null, verified_by uuid, status pub_status default 'pending_review', created_at timestamptz default now());

create table corrections (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null,
  body text not null, source_url text, contact_email text,          -- optional, never published
  status text not null default 'open' check (status in ('open','applied','declined')),
  decided_by uuid, decided_at timestamptz, decision_note text, created_at timestamptz default now());

create table datasets (key text primary key, data jsonb not null, source_ids uuid[] not null, updated_at timestamptz default now());
create table staff (user_id uuid primary key references auth.users, role staff_role not null, display_name text not null);
create table silence_windows (id uuid primary key default gen_random_uuid(), constituency_ids text[] not null, starts_at timestamptz not null, ends_at timestamptz not null, note text);

create table audit_log (
  id bigserial primary key, at timestamptz not null default now(), actor uuid, actor_name text,
  table_name text not null, row_id uuid, action text not null, before jsonb, after jsonb, reason text not null);
create table snapshots (id bigserial primary key, taken_at timestamptz default now(), storage_path text not null, sha256 text not null, prev_sha256 text);
```

**Access rules (row-level security)**

- Public (`anon`): select only through views `v_people`, `v_entries`, `v_cases`, `v_promises`, `v_changelog`, which filter to `status = 'published'`. `v_changelog` exposes `actor_name`, never email.
- Public insert only into `corrections` and `replies`, via an Edge or route handler that checks Turnstile and rate limits by IP hash.
- Staff: no direct insert, update or delete on editorial tables. All writes go through `security definer` functions such as `rpc_save_entry`, `rpc_approve`, `rpc_add_case_event`, `rpc_update_promise`, `rpc_retract`.
- Each function checks the caller’s `staff.role`, rule R1 (source), R4 (approval), R9 (silence window), and that a non-empty reason was passed.

**Audit trigger**

- One `after insert or update or delete` trigger on every editorial table writes to `audit_log`, reading the reason from `current_setting('app.reason')`, which each `rpc_` function sets with `set_config`. If the reason is missing the trigger raises an error and the write rolls back.
- `revoke update, delete, truncate on audit_log from public, authenticated, service_role;` plus a trigger that raises on any update or delete. Admins can’t rewrite history either.

**Tamper evidence.** A nightly job exports all published data to `snapshots/YYYY-MM-DD.json`, stores its SHA-256 and the previous day’s hash in `snapshots`, and publishes the hash chain at `/data/hashes.txt`. Anyone holding an old snapshot can prove whether history was altered.

## Functional requirements

The public site answers “what is on record about my leader and my constituency”; the console makes every change sourced, reviewed and logged.

**Public site (no login)**

| ID | Page | Must show |
| --- | --- | --- |
| P1 | Home | Coming-up dates, counts of profiles and cases, latest 10 changes, source-tag legend |
| P2 | Leaders list | Search, filter by party and role, sort by name; same columns for everyone |
| P3 | Leader page | Role, seat, affidavit card with R10 sentence, work and issue entries with source tags, linked cases, replies, “last changed” date |
| P4 | Constituency page (136) | Sitting MLA or MP, past results, affidavit summary, entries for that member |
| P5 | Cases list and case page | Stage rail, status pill (Pending, Final, Stage not verified), event history with sources |
| P6 | Promises | Grouped by manifesto, status pill, latest update with source, full status history on expand |
| P7 | Finances | Debt by definition chart, guarantee allocations, investment-grounding gap |
| P8 | Elections | Results tables 2023 to date, MLA background summary |
| P9 | Change log | Paged audit feed: date, editor display name, summary, reason, source; filter by person or case |
| P10 | How we record | Source tiers, stage definitions, rules R1 to R11, editorial team, funding statement |
| P11 | Data | Download current JSON and CSV per table, snapshot list with SHA-256 hashes |
| P12 | Suggest a correction | Form on every entry, case and promise: what’s wrong, source link, optional email; Turnstile |

Every public page has a shareable URL per leader, case and constituency (`/leaders/[slug]`, `/cases/[slug]`, `/constituencies/[id]`), Open Graph images, and works in both English and Telugu.

**Editor console (`/admin`, staff only)**

1. Sign in with magic link, then TOTP. No MFA, no access.
2. Dashboard: my drafts, items waiting for my review, open corrections, cases not checked in 30 days, live silence windows.
3. Entry editor: person, kind, text (English, optional Telugu), source picker or new source (type, URL, title, publisher, date), reason. Validation per R1, R2 and R5 shown inline before save.
4. Source capture: on save, fetch the URL server-side, store a PDF or HTML copy in Storage and its SHA-256, so dead links don’t erase evidence.
5. Review queue: Reviewers see diffs (before and after) and approve or send back with a note. A reviewer cannot approve their own item.
6. Case update: pick the new stage, event date, note, source, reason; goes to review.
7. Promise update: status, detail, source, reason; published by one editor, as a status change is less sensitive than an issue entry.
8. Corrections triage: link each correction to the change that fixed it, or decline with a note. Both outcomes logged.
9. Right of reply: verify the office (email domain or a signed letter upload), then publish the reply unedited.
10. Retract: never delete a published entry; mark retracted with a reason. The public page shows “Retracted on DATE: reason”.
11. Admin: manage staff roles, silence windows, parties and constituencies.

**Automation**

- Nightly: snapshot and hash chain (see Data model), sitemap rebuild.
- Weekly: flag cases and promises with no update in 30 days on the dashboard.
- Affidavit import: load MyNeta/ECI affidavit data for all 2023 Assembly and 2024 Lok Sabha winners into a staging table; an editor confirms each record before it publishes. Check the data source’s terms of use or ask ADR for a data-sharing permission before scraping.
- eCourts: no automated scraping (captcha and terms). Store each case’s CNR number and show editors a direct link plus a “next hearing” reminder.
- On every publish: `revalidateTag` for the affected person, case, constituency and home page.

## Non-functional requirements

The site will be attacked by partisans of every side, so security and auditability matter more than features.

| Area | Requirement |
| --- | --- |
| Performance | Public pages statically generated; LCP under 2.5 s and total JS under 150 KB on leader pages over 4G |
| Availability | Public pages served from Vercel’s edge cache, so a database outage doesn’t take the site down; target 99.9% |
| Security | No service-role key in client code or `NEXT_PUBLIC_` variables; strict Content Security Policy; RLS tests in CI fail the build on any anon write path |
| Abuse | Turnstile plus per-IP-hash rate limits on public forms (5 per hour); corrections queue limited to 2,000 open items |
| Accounts | MFA required for all staff; sessions expire after 12 hours; staff removal revokes sessions immediately |
| Backups | Supabase point-in-time recovery on; nightly snapshots kept in Storage for 2 years |
| Languages | All UI strings in `en` and `te` message files; Telugu font Noto Sans Telugu; language toggle on every page; URLs `/en/…` and `/te/…` |
| Accessibility | WCAG 2.2 AA: keyboard navigation, visible focus, 4.5:1 contrast, stage rail readable by screen readers |
| Privacy | No cookies for visitors; cookieless analytics; correction emails never published and deleted 90 days after a decision; privacy notice under the DPDP Act 2023 |
| Legal | Defamation (Bharatiya Nyaya Sanhita s.356): wording rules R2 and R3, a published takedown and reply process, and legal review of stage labels before launch |
| Observability | Error tracking on server actions and cron jobs; alert when the nightly snapshot fails |

## Cursor rules file

Save this as `.cursor/rules/praja-ledger.mdc`. It applies to every Cursor chat in the repo and stops the agent from drifting away from the editorial rules.

```markdown
---
description: Praja Ledger project rules
alwaysApply: true
---

You are building Praja Ledger, a non-partisan public register of Telangana leaders' records.
The full spec is docs/PRD.md. Read it before any non-trivial change.

## Non-negotiables
- Never write to editorial tables directly from app code. All writes go through the Postgres
  rpc_* functions in supabase/migrations. If a write path you need doesn't exist, add an rpc_
  function in a new migration that checks role, source rules, silence windows and reason.
- Every write must pass a non-empty `reason`, which ends up in audit_log.
- Never add UPDATE or DELETE paths to audit_log. Never hard-delete published content; retract it.
- Tier-1 sources (COURT, CAG, ECI, SPKR) require a URL. Enforce in Zod AND in SQL.
- Legal matters are described by stage only. Do not generate copy that calls anyone corrupt,
  guilty or a criminal unless quoting a court verdict.
- Claims (GOV, OPP, PARTY) render as attributed claims, never in the site's own voice.
- Every person gets identical fields. Missing data renders "Not compiled yet".
- No scores, rankings, grades, polls or recommendations of any candidate or party.
- No party colours in the UI. Party is shown as a neutral text chip.
- Never expose the service-role key to the browser or NEXT_PUBLIC_ env vars.
- Never store or render addresses, ID numbers, phone numbers or family details.

## Code conventions
- Next.js App Router, TypeScript strict, server components by default; client components only
  for interactivity.
- Data access in /lib/data (reads via public views) and /lib/actions (server actions calling rpc_).
- Shared Zod schemas in /lib/schemas, used by forms and server actions.
- All user-facing strings in /messages/en.json and /messages/te.json. No hardcoded copy.
- Database changes only as new SQL files in supabase/migrations; never edit an applied migration.
- Generate DB types with `supabase gen types typescript` after each migration.
- After a publish, call revalidateTag for affected person, case, constituency and 'home'.

## Testing
- Every rpc_ function gets SQL tests for: allowed role, forbidden role, missing reason,
  tier-1 without URL, inside silence window, self-approval.
- Every page gets a Playwright smoke test in en and te.
- Run tests before saying a task is done. If tests fail, fix them; don't delete them.

## Copy style
- Plain, neutral, sentence case. Active voice. No adjectives about people.
- Dates as "25 Oct 2026". Money as "₹4.42 lakh cr" with the definition stated next to any debt figure.
```

## Build plan and Cursor prompts

Ten phases, each a fresh Agent chat. The database and its rules come before any UI, because a UI built first will bake in direct table writes that skip the audit log.

### Phase 0: Scaffold

```text
@docs/PRD.md Set up the project skeleton only. Create a Next.js App Router app with TypeScript strict,
Tailwind, next-intl (locales en and te, default en, URLs /en and /te), Zod, Vitest and Playwright.
Initialise Supabase locally (supabase init) with an empty migrations folder. Add .env.example with
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (server only).
Create folders /lib/data, /lib/actions, /lib/schemas, /messages, /app/[locale]. Add a placeholder
home page in both locales. Add npm scripts: dev, build, test, test:e2e, db:types. Do not build features.
```

- [ ] `npm run build` and `npm test` pass
- [ ] `/en` and `/te` both render

### Phase 1: Schema, access rules and audit log

```text
@docs/PRD.md Implement the Data model section as Supabase migrations: enums, tables, constraints,
the public views (v_people, v_entries, v_cases, v_promises, v_changelog) and RLS so anon can only
select from the views. Create the audit trigger on every editorial table that reads
current_setting('app.reason') and raises if it is empty. Make audit_log append-only (revoke plus a
blocking trigger). Write security-definer functions rpc_save_entry, rpc_approve, rpc_retract,
rpc_add_case_event, rpc_update_promise, rpc_save_source, each checking staff role, the tier-1 URL rule,
silence windows, the four-eyes rule and a non-empty reason, then calling set_config('app.reason', ...).
Write SQL tests for every function covering the cases listed in the Cursor rules file.
Generate TypeScript types.
```

- [ ] As `anon`, any insert, update or delete on an editorial table fails
- [ ] A write without a reason fails and leaves no row
- [ ] Updating or deleting an `audit_log` row fails, even as service role
- [ ] A reviewer approving their own issue entry fails

### Phase 2: Seed import

```text
@docs/PRD.md @supabase/seed/register.json Write scripts/import-register.ts that maps the exported
Claude register into the schema: parties, people (slug = existing id), entries (work and issues,
all as published, created_by = a 'system-import' staff user, approved_by = same, verify as given),
sources (one per entry; type from src, url from url), cases with case_stages from ladder and one
case_event for the current stage, promises with one promise_updates row each, and datasets for
finance and elections. Every insert goes through the rpc_ functions with reason
'Initial import from Claude register, 25 Oct 2026'. Make the script idempotent.
```

- [ ] 27 people, 9 cases and 24 promises in the database
- [ ] `audit_log` has one row per imported record, all with the import reason
- [ ] Running the script twice creates no duplicates

### Phase 3: Public site

```text
@docs/PRD.md Build public pages P1 to P10 from the Functional requirements, reading only from the
public views via /lib/data. Use static generation with revalidation tags (person:<slug>,
case:<slug>, constituency:<id>, home). Port the visual design of the prototype: neutral party
chips, source-tag badges whose tier is shown by border style (solid, outline, dashed), the case
stage rail, the debt-by-definition bars. Every string goes in messages/en.json and te.json
(Telugu can be machine-drafted and marked TODO-review). Add Playwright smoke tests per page in both locales.
```

- [ ] Every page renders in `en` and `te` with no hardcoded English
- [ ] Affidavit card always shows the R10 sentence
- [ ] Lighthouse mobile performance 90+ on a leader page

### Phase 4: Editor console

```text
@docs/PRD.md Build /[locale]/admin per the Editor console list, items 1 to 7 and 10 to 11.
Supabase Auth magic link plus mandatory TOTP enrolment; middleware blocks /admin without aal2.
Forms use the shared Zod schemas and call server actions in /lib/actions that call rpc_ functions.
Show validation for R1, R2 (block the words corrupt, scam, guilty, criminal unless source type
is COURT) and R5 inline. Review queue shows a before/after diff. On save, capture the source URL
server-side into Storage with its SHA-256. After publish, call revalidateTag.
```

- [ ] An editor cannot publish an issue entry without a different reviewer approving it
- [ ] A COURT entry without a URL can’t be submitted
- [ ] Published change appears on the public page within 60 seconds
- [ ] Change log shows the editor’s display name and the reason

### Phase 5: Corrections and right of reply

```text
@docs/PRD.md Build P12 and console items 8 and 9. Public forms post to route handlers that verify
Cloudflare Turnstile server-side and rate-limit by a salted hash of the IP (5 per hour). Corrections
land as open; staff link each to the fixing change or decline with a note, both logged. Replies
need office verification and publish unedited beside the entry. Never show contact emails publicly;
add a job that nulls contact_email 90 days after a decision.
```

- [ ] A correction can be submitted without an account, and appears in the triage queue
- [ ] Contact emails never appear in any public view or export

### Phase 6: Open data and tamper evidence

```text
@docs/PRD.md Build P11 and the nightly snapshot: a Vercel Cron route that exports all published
rows to JSON, uploads to Storage as snapshots/YYYY-MM-DD.json, records sha256 and prev_sha256 in
snapshots, and serves /data/hashes.txt. Add CSV export per public view. Add a /data page explaining
how to verify a snapshot with sha256sum.
```

- [ ] Downloading a snapshot and running `sha256sum` matches the published hash
- [ ] Each snapshot row stores the previous day’s hash

### Phase 7: Constituencies and affidavit import

```text
@docs/PRD.md Load all 119 Assembly and 17 Lok Sabha constituencies, then build P4 pages. Build an
affidavit import into a staging table from a CSV I will provide (columns: constituency, name, party,
assets, liabilities, declared_cases, serious_cases, source_url). Editors confirm each staged row in
the console before it publishes through rpc_. Do not scrape any website.
```

- [ ] 136 constituency pages exist, each showing the sitting member or “Not compiled yet”
- [ ] No affidavit row publishes without an editor confirming it

### Phase 8: Telugu review pass

```text
@docs/PRD.md List every message key in te.json still marked TODO-review and every person, case and
promise missing a Telugu field, as a CSV for a human translator. Add an admin screen to edit Telugu
fields with reasons, through rpc_ functions.
```

- [ ] Translator CSV generated; no TODO-review strings left at launch

### Phase 9: Hardening and launch

```text
@docs/PRD.md Implement silence windows end to end (admin UI, rpc checks, public banner). Add CSP
headers, error tracking on server actions and cron, an alert on snapshot failure, sitemap and
Open Graph images. Write a launch checklist covering backups, MFA for all staff, RLS test pass,
and a legal review sign-off. Deploy to Vercel production.
```

- [ ] Inside a silence window, every publish for that constituency is refused with a clear message
- [ ] All SQL, unit and Playwright tests pass in CI
- [ ] Legal review signed off

## Seed data and open questions

The Claude register is the seed: export it once and the Phase 2 script maps it into the schema.

| Register JSON | Production table | Notes |
| --- | --- | --- |
| `leaders.<id>` | `people` (slug = id), `affidavits` | `aff` becomes an affidavit row with an ECI source; URL to be added before publishing |
| `leaders.<id>.work[]`, `.issues[]` | `entries` + `sources` | `kind` = work or issue; `src` = source type; `verify` kept |
| `cases.<id>` | `cases`, `case_stages`, `case_events` | `ladder` becomes stages; `now` becomes one event; `cfv` stays state `unknown` |
| `promises.<id>.items[]` | `promises` + `promise_updates` | One update row per item with its current status |
| `datasets.finance`, `.elections` | `datasets` | Kept as JSON until they get their own tables |
| `changelog` | Not imported | Production history starts at the import; the import itself is logged |

7 leader entries and 11 promise lines are still marked Verify, and the 2015 cash-for-vote case has no verified stage. They import as published but flagged; clear them in the console before public launch, as the success metric requires.

**Open questions**

- [ ] Who is the publisher of record (a registered trust, company or individual)? Needed for the legal notice and the funding statement.
- [ ] Who sits on the editorial team, and does it include people from different political leanings as reviewers?
- [ ] What domain will the site use?
- [ ] Who translates and reviews Telugu content?
- [ ] Will ADR grant permission to reuse affidavit data, or will editors enter it from ECI affidavits directly?
