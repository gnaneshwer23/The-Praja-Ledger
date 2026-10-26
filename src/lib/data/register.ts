import { cacheLife, cacheTag } from "next/cache";
import type { Client } from "pg";
import { connectOwner } from "@/lib/db/owner";
import {
  buildRegister,
  PUBLIC_COLUMNS,
  PUBLIC_VIEWS,
  type PublicRow,
  type PublicView,
  type RegisterDocument,
  type SnapshotRow,
} from "./export";

const TEXT_TIME: Record<string, string> = {
  created_at: `to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at`,
  updated_at: `to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_at`,
  taken_at: `to_char(taken_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as taken_at`,
  at: `to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at`,
  published_on: `to_char(published_on, 'YYYY-MM-DD') as published_on`,
};

const ORDER_BY: Record<PublicView, string> = {
  affidavit_changes: "x.earlier_year, x.later_year, x.id",
  affidavits: "x.constituency_id, x.year, x.page_number, x.id",
  case_stages: "x.case_id, x.idx",
  cases: "x.slug, x.id",
  changelog: "x.id",
  constituencies: "x.id",
  datasets: "x.key",
  entries: "x.id",
  parties: "x.id",
  people: "x.slug, x.id",
  promises: "x.id",
  replies: "x.id",
  snapshots: "x.id",
  sources: "x.id",
};

function columnSql(column: string) {
  if (column === "id" || column === "row_id") return `${column}::text as ${column}`;
  return TEXT_TIME[column] ?? column;
}

function viewSql(view: PublicView, columns: readonly string[]) {
  const selected = columns.map((column) => columnSql(column)).join(", ");
  return `coalesce((select json_agg(row_to_json(x) order by ${ORDER_BY[view]}) from (select ${selected} from public.v_${view}) x), '[]'::json)`;
}

async function selectView(client: Client, view: PublicView, columns: readonly string[]) {
  const result = await client.query<{ rows: unknown }>(`select ${viewSql(view, columns)} as rows`);
  return jsonRows(result.rows[0]?.rows);
}

function missingColumn(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return String((error as { code: unknown }).code) === "42703";
}

function jsonRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed;
  }
  throw new Error("public view did not return a list");
}

function missingAffidavitView(error: unknown, view: PublicView) {
  if (view !== "affidavits" && view !== "affidavit_changes") return false;
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code: unknown }).code);
  return code === "42P01" || code === "42703";
}

export async function queryView(client: Client, view: PublicView): Promise<unknown[]> {
  try {
    return await selectView(client, view, PUBLIC_COLUMNS[view]);
  } catch (error) {
    if (missingAffidavitView(error, view)) return [];
    if (view === "cases" && missingColumn(error)) {
      const columns = PUBLIC_COLUMNS.cases.filter((column) => column !== "title_te" && column !== "summary_te");
      return selectView(client, view, columns);
    }
    throw error;
  }
}

export async function queryRegister(client: Client): Promise<unknown> {
  const document: Record<string, unknown> = {};
  for (const view of PUBLIC_VIEWS) document[view] = await queryView(client, view);
  return document;
}

export async function querySnapshots(client: Client): Promise<SnapshotRow[]> {
  const result = await client.query<{
    id: string;
    taken_at: string;
    storage_path: string;
    sha256: string;
    prev_sha256: string | null;
  }>(`
    select
      id::text as id,
      to_char(taken_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as taken_at,
      storage_path,
      sha256,
      prev_sha256
    from public.v_snapshots
    order by id
  `);
  return result.rows.flatMap((row) => {
    if (!/^[0-9a-f]{64}$/.test(row.sha256)) return [];
    if (row.prev_sha256 !== null && !/^[0-9a-f]{64}$/.test(row.prev_sha256)) return [];
    if (!/^snapshots\/\d{4}-\d{2}-\d{2}\.json$/.test(row.storage_path)) return [];
    return [{
      id: row.id,
      takenAt: row.taken_at,
      storagePath: row.storage_path,
      sha256: row.sha256,
      prevSha256: row.prev_sha256,
    }];
  });
}

export async function readRegister(): Promise<RegisterDocument | null> {
  const client = await connectOwner();
  if (!client) return null;
  try {
    return buildRegister(await queryRegister(client));
  } catch {
    return null;
  } finally {
    await client.end();
  }
}

export async function readSnapshots(): Promise<SnapshotRow[] | null> {
  const client = await connectOwner();
  if (!client) return null;
  try {
    return await querySnapshots(client);
  } catch {
    return null;
  } finally {
    await client.end();
  }
}

export async function readCachedSnapshots(): Promise<SnapshotRow[] | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("data");
  return readSnapshots();
}

export async function readView(view: PublicView): Promise<PublicRow[] | null> {
  const client = await connectOwner();
  if (!client) return null;
  try {
    const rows = await queryView(client, view);
    return buildRegister({ [view]: rows })[view];
  } catch {
    return null;
  } finally {
    await client.end();
  }
}
