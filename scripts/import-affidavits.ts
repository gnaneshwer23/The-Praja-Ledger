/**
 * Stages affidavit rows from a CSV the editor supplies.
 * Opened ECI affidavits only. An ADR or MyNeta file is not imported.
 * Confirming a row is a later step in the editor console. This script does not publish.
 *
 * Reads DATABASE_URL from the environment or from .env.local.
 * That connection stays off the client and is not printed.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import {
  AFFIDAVIT_STAGE_REASON,
  affidavitFileDecision,
  knownSeats,
  planAffidavitImport,
} from "../src/lib/import/affidavit";
import { EDITOR_ID } from "../src/lib/import/plan";

const RESERVATION_REASON = "Record the seat reservation from the supplied affidavit file.";
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "test-results"]);

function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  try {
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
  } catch {
    // The import can still report that no file was found.
  }
}

function redact(value: string) {
  return value
    .replace(/postgresql:\/\/\S+/gi, "postgresql://[redacted]")
    .replace(/npg_[A-Za-z0-9]+/g, "[redacted]");
}

function withoutChannelBinding(url: string) {
  let next = url
    .replace(/([?&])channel_binding=[^&]*/g, "$1")
    .replace("?&", "?")
    .replace(/&&/g, "&")
    .replace(/[?&]$/, "");
  if (/[?&]sslmode=/.test(next)) {
    next = next.replace(/([?&])sslmode=[^&]*/g, "$1sslmode=require");
  } else {
    next += `${next.includes("?") ? "&" : "?"}sslmode=require`;
  }
  return next;
}

async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
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
    if (/password authentication failed|authentication failed/i.test(message)) {
      throw new Error("database login was rejected");
    }
    if (url.includes("channel_binding") && /channel.?binding/i.test(message)) {
      try {
        return await open(withoutChannelBinding(url));
      } catch (retry) {
        const retryMessage = retry instanceof Error ? retry.message : String(retry);
        if (/password authentication failed|authentication failed/i.test(retryMessage)) {
          throw new Error("database login was rejected");
        }
        throw new Error(redact(retryMessage));
      }
    }
    throw new Error(redact(message));
  }
}

async function asUser<T>(client: pg.Client, run: () => Promise<T>) {
  await client.query("begin");
  try {
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [EDITOR_ID]);
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: EDITOR_ID, role: "authenticated" }),
    ]);
    const value = await run();
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

function walk(dir: string, depth: number, found: string[], skipped: string[]) {
  if (depth < 0) return;
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    let info: ReturnType<typeof statSync>;
    try {
      info = statSync(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) {
      walk(full, depth - 1, found, skipped);
      continue;
    }
    const decision = affidavitFileDecision(name);
    if (decision === "adr") skipped.push(full);
    if (decision === "import") found.push(full);
  }
}

async function main() {
  loadEnvLocal();
  const found: string[] = [];
  const skipped: string[] = [];
  walk(process.cwd(), 4, found, skipped);
  walk("/Users/gnaneshwerjadav/Downloads", 2, found, skipped);
  for (const file of skipped) {
    console.log(`Skipped ${path.basename(file)}. ADR permission is not recorded, so the file was not imported.`);
  }
  if (found.length === 0) {
    console.log("No user-supplied affidavit CSV was found. Affidavit fields stay not compiled yet.");
    return;
  }

  const plans = found.map((file) => {
    const text = readFileSync(file, "utf8");
    const fileKey = createHash("sha256").update(text, "utf8").digest("hex");
    return { file, plan: planAffidavitImport(text, knownSeats(), fileKey) };
  });
  for (const item of plans) {
    console.log(
      `${path.basename(item.file)}: ${item.plan.rows.length} staged, ${item.plan.rejected.length} rejected, ${item.plan.changes.length} calculated changes waiting for both rows to be confirmed.`,
    );
    for (const rejection of item.plan.rejected) {
      console.log(`  line ${rejection.line}: ${rejection.reason}`);
    }
  }
  if (plans.every((item) => item.plan.rows.length === 0 && item.plan.constituencies.length === 0)) return;

  const client = await connect();
  if (!client) {
    console.log("DATABASE_URL is not set. Nothing was written.");
    return;
  }
  try {
    const ready = await client.query(
      "select to_regprocedure('public.rpc_stage_affidavit(text,text,text,text,text,integer,bigint,bigint,integer,integer,text,integer,text,text)') as fn",
    );
    if (!ready.rows[0]?.fn) {
      console.log("The affidavit import functions are not installed. Nothing was written.");
      return;
    }
    for (const item of plans) {
      for (const seat of item.plan.constituencies) {
        await asUser(client, () =>
          client.query("select public.rpc_set_constituency_reservation($1, $2, $3)", [
            seat.constituencyId,
            seat.reservationCategory,
            RESERVATION_REASON,
          ]),
        );
      }
      for (const row of item.plan.rows) {
        await asUser(client, () =>
          client.query(
            "select public.rpc_stage_affidavit($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
            [
              row.constituencyId,
              row.personName,
              row.partyName,
              row.personSlug,
              row.election,
              row.year,
              row.assetsInr,
              row.liabilitiesInr,
              row.declaredCases,
              row.seriousCases,
              row.sourceUrl,
              row.pageNumber,
              row.fileKey,
              AFFIDAVIT_STAGE_REASON,
            ],
          ),
        );
      }
    }
    console.log("Staged. Public pages stay unchanged until a different editor confirms each row.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "import failed";
  console.error(redact(message));
  process.exitCode = 1;
});
