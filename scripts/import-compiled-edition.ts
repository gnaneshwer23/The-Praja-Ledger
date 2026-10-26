/**
 * Loads the compiled static edition through rpc_* functions.
 * This is not the Claude register export. register.json is still missing.
 * Do not invent people, cases, promises, dates, or figures to reach 27 / 9 / 24.
 *
 * Reads DATABASE_URL from the environment or from .env.local.
 * That connection is the database owner and must stay off the client.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { buildPlan, EDITOR_ID, IMPORT_REASON, REVIEWER_ID } from "../src/lib/import/plan";

function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function redact(value: string) {
  return value
    .replace(/postgresql:\/\/\S+/gi, "postgresql://[redacted]")
    .replace(/npg_[A-Za-z0-9]+/g, "[redacted]");
}

function withoutChannelBinding(url: string) {
  return url
    .replace(/([?&])channel_binding=[^&]*/g, "$1")
    .replace("?&", "?")
    .replace(/&&/g, "&")
    .replace(/[?&]$/, "");
}

async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const open = async (connectionString: string) => {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: true },
    });
    await client.connect();
    return client;
  };
  try {
    return await open(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (url.includes("channel_binding") && /channel.?binding/i.test(message)) {
      return open(withoutChannelBinding(url));
    }
    throw error;
  }
}

async function asUser<T>(
  client: pg.Client,
  userId: string,
  run: () => Promise<T>,
): Promise<T> {
  await client.query("begin");
  try {
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    const value = await run();
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  loadEnvLocal();
  const plan = buildPlan();
  const client = await connect();
  try {
    const ready = await client.query(
      "select to_regprocedure('public.rpc_import_source(public.source_type,text,text,text,date,text)') as fn",
    );
    if (!ready.rows[0]?.fn) {
      throw new Error("rpc_import_source is not installed. Apply the Phase 1 and Phase 2 migrations first.");
    }

    for (const party of plan.parties) {
      await asUser(client, EDITOR_ID, () =>
        client.query("select public.rpc_save_party($1, $2, $3, $4)", [
          party.id,
          party.name,
          null,
          IMPORT_REASON,
        ]),
      );
    }

    for (const seat of plan.constituencies) {
      await asUser(client, EDITOR_ID, () =>
        client.query("select public.rpc_save_constituency($1, $2, $3, $4, $5, $6, $7)", [
          seat.id,
          seat.kind,
          seat.number,
          seat.name,
          null,
          null,
          IMPORT_REASON,
        ]),
      );
    }

    const personIds = new Map<string, string>();
    for (const person of plan.people) {
      const row = await asUser(client, EDITOR_ID, () =>
        client.query(
          "select public.rpc_save_person($1, $2, $3, $4, $5, $6, $7, $8) as id",
          [
            person.slug,
            person.name,
            person.nameTe,
            person.partyId,
            person.role,
            person.constituencyId,
            person.statusNote,
            IMPORT_REASON,
          ],
        ),
      );
      personIds.set(person.slug, row.rows[0].id as string);
    }

    const sourceIds = new Map<string, string>();
    for (const source of plan.sources) {
      const row = await asUser(client, EDITOR_ID, () =>
        client.query(
          "select public.rpc_import_source($1::public.source_type, $2, $3, $4, $5::date, $6) as id",
          [source.type, source.url, source.title, source.publisher, source.publishedOn, IMPORT_REASON],
        ),
      );
      sourceIds.set(source.key, row.rows[0].id as string);
    }

    for (const entry of plan.entries) {
      const sourceId = sourceIds.get(entry.sourceKey);
      const personId = personIds.get(entry.personSlug);
      if (!sourceId || !personId) {
        throw new Error(`Missing source or person for ${entry.externalId}`);
      }
      const saved = await asUser(client, EDITOR_ID, () =>
        client.query(
          `select public.rpc_import_entry(
            $1, $2, $3::public.entry_kind, $4, $5, $6, $7, $8, $9, $10, $11, $12
          ) as id`,
          [
            entry.externalId,
            personId,
            entry.kind,
            entry.body,
            null,
            sourceId,
            entry.title,
            entry.statusLine,
            entry.section,
            entry.tone,
            entry.verify,
            IMPORT_REASON,
          ],
        ),
      );
      if (entry.kind === "issue") {
        const status = await client.query("select status::text as status from public.entries where id = $1", [
          saved.rows[0].id,
        ]);
        if (status.rows[0]?.status === "pending_review") {
          await asUser(client, REVIEWER_ID, () =>
            client.query("select public.rpc_approve($1, $2, $3)", [
              "entry",
              saved.rows[0].id,
              IMPORT_REASON,
            ]),
          );
        }
      }
    }

    for (const item of plan.cases) {
      const partyId = item.partyId;
      const caseRow = await asUser(client, EDITOR_ID, () =>
        client.query(
          "select public.rpc_save_case($1, $2, $3, $4, $5::public.case_state, $6) as id",
          [item.slug, item.title, item.summary, partyId, item.state, IMPORT_REASON],
        ),
      );
      const caseId = caseRow.rows[0].id as string;
      await asUser(client, EDITOR_ID, () =>
        client.query("select public.rpc_save_case_stage($1, $2, $3, $4)", [
          caseId,
          0,
          item.stageLabel,
          IMPORT_REASON,
        ]),
      );
      for (const slug of item.people) {
        const personId = personIds.get(slug);
        if (!personId) continue;
        await asUser(client, EDITOR_ID, () =>
          client.query("select public.rpc_link_case_person($1, $2, $3, $4)", [
            caseId,
            personId,
            null,
            IMPORT_REASON,
          ]),
        );
      }
      const sourceId = sourceIds.get(item.sourceKey);
      if (!sourceId) throw new Error(`Missing case source for ${item.slug}`);
      const existing = await client.query(
        "select id, status::text as status from public.case_events where case_id = $1 and note = $2",
        [caseId, item.eventNote],
      );
      let eventId = existing.rows[0]?.id as string | undefined;
      let status = existing.rows[0]?.status as string | undefined;
      if (!eventId) {
        const created = await asUser(client, EDITOR_ID, () =>
          client.query(
            "select public.rpc_add_case_event($1, $2, $3::date, $4, $5, $6) as id",
            [caseId, 0, item.eventDate, item.eventNote, sourceId, IMPORT_REASON],
          ),
        );
        eventId = created.rows[0].id as string;
        status = "pending_review";
      }
      if (status === "pending_review" && eventId) {
        await asUser(client, REVIEWER_ID, () =>
          client.query("select public.rpc_approve($1, $2, $3)", ["case_event", eventId, IMPORT_REASON]),
        );
      }
    }

    for (const promise of plan.promises) {
      const promiseRow = await asUser(client, EDITOR_ID, () =>
        client.query(
          "select public.rpc_save_promise($1, $2, $3, $4, $5, $6, $7, $8, $9) as id",
          [
            promise.externalId,
            promise.manifesto,
            promise.partyId,
            promise.area,
            promise.body,
            null,
            promise.sort,
            promise.title,
            IMPORT_REASON,
          ],
        ),
      );
      const promiseId = promiseRow.rows[0].id as string;
      if (!promise.sourceKey || !promise.detail) continue;
      const sourceId = sourceIds.get(promise.sourceKey);
      if (!sourceId) throw new Error(`Missing promise source for ${promise.externalId}`);
      const existing = await client.query(
        `select 1 from public.promise_updates
         where promise_id = $1 and detail = $2 and status = $3::public.promise_status`,
        [promiseId, promise.detail, promise.status],
      );
      if (existing.rowCount === 0) {
        await asUser(client, EDITOR_ID, () =>
          client.query("select public.rpc_update_promise($1, $2::public.promise_status, $3, $4, $5)", [
            promiseId,
            promise.status,
            promise.detail,
            sourceId,
            IMPORT_REASON,
          ]),
        );
      }
    }

    for (const dataset of plan.datasets) {
      const ids = dataset.sourceKeys
        .map((key) => sourceIds.get(key))
        .filter((id): id is string => Boolean(id));
      await asUser(client, EDITOR_ID, () =>
        client.query("select public.rpc_save_dataset($1, $2::jsonb, $3::uuid[], $4)", [
          dataset.key,
          JSON.stringify(dataset.data),
          ids,
          IMPORT_REASON,
        ]),
      );
    }

    const counts = await client.query(`
      select
        (select count(*) from public.people) as people,
        (select count(*) from public.cases) as cases,
        (select count(*) from public.promises) as promises,
        (select count(*) from public.entries) as entries,
        (select count(*) from public.entries where status = 'published') as published_entries,
        (select count(*) from public.entries where verify) as verify_entries,
        (select count(*) from public.sources) as sources,
        (select count(*) from public.constituencies) as constituencies,
        (select count(*) from public.affidavits) as affidavits,
        (select count(*) from public.sources where type in ('COURT', 'CAG', 'ECI', 'SPKR') and nullif(btrim(coalesce(url, '')), '') is null) as tier1_without_url,
        (select party_id from public.people where slug = 'k-kavitha') as kavitha_party
    `);
    const row = counts.rows[0];
    console.log("Compiled static edition import finished.");
    console.log(`people ${row.people}`);
    console.log(`cases ${row.cases}`);
    console.log(`promises ${row.promises}`);
    console.log(`entries ${row.entries}`);
    console.log(`published_entries ${row.published_entries}`);
    console.log(`verify_entries ${row.verify_entries}`);
    console.log(`sources ${row.sources}`);
    console.log(`constituencies ${row.constituencies}`);
    console.log(`affidavits ${row.affidavits}`);
    console.log(`tier1_without_url ${row.tier1_without_url}`);
    console.log(`kavitha_party ${row.kavitha_party ?? "null"}`);
    console.log("skipped:");
    for (const skip of plan.skips) {
      console.log(`- ${skip.kind}: ${skip.title}. ${skip.reason}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(redact(message));
  process.exit(1);
});
