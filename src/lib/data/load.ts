import { cacheLife, cacheTag } from "next/cache";
import pg from "pg";
import { entries, leaders } from "../../data/ledger";
import { seats } from "../../data/constituencies";
import {
  assembleEdition,
  type AffidavitChangeRow,
  type AffidavitRow,
  type Edition,
  type PublishedReply,
  type PublicRows,
} from "./map";
import { caseTag, constituencyTag, HOME_TAG, personTag } from "./tags";

/**
 * Server-only read of the public views. DATABASE_URL is the database owner
 * connection and must not be imported by a client component.
 * Tags: home, person:<slug>, case:<slug>, constituency:<id>.
 * A publish path calls revalidateTag(tag, "max") for those same tags.
 */

const query = `
  select
    coalesce((select json_agg(json_build_object(
      'id', id, 'slug', slug, 'name', name, 'name_te', name_te,
      'party_id', party_id, 'role', role, 'constituency_id', constituency_id,
      'status_note', status_note
    )) from public.v_people), '[]'::json) as people,
    coalesce((select json_agg(json_build_object('id', id, 'name', name)) from public.v_parties), '[]'::json) as parties,
    coalesce((select json_agg(json_build_object(
      'person_id', person_id, 'external_id', external_id, 'title', title,
      'body', body, 'status_line', status_line, 'section', section,
      'tone', tone, 'verify', verify, 'source_id', source_id
    )) from public.v_entries), '[]'::json) as entries,
    coalesce((select json_agg(json_build_object(
      'id', id, 'type', type, 'url', url, 'title', title,
      'publisher', publisher, 'published_on', to_char(published_on, 'YYYY-MM-DD')
    )) from public.v_sources), '[]'::json) as sources,
    coalesce((select json_agg(json_build_object('slug', slug)) from public.v_cases), '[]'::json) as cases,
    coalesce((select json_agg(json_build_object(
      'external_id', external_id, 'current_status', current_status
    )) from public.v_promises), '[]'::json) as promises,
    coalesce((select json_agg(json_build_object(
      'id', id, 'kind', kind, 'number', number, 'name', name
    )) from public.v_constituencies), '[]'::json) as constituencies,
    coalesce((select json_agg(json_build_object('key', key, 'data', data)) from public.v_datasets), '[]'::json) as datasets
`;

function missingAffidavitSchema(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code: unknown }).code);
  return code === "42P01" || code === "42703";
}

async function optionalRows<T>(client: pg.Client, sql: string): Promise<T[]> {
  try {
    const result = await client.query(sql);
    return result.rows as T[];
  } catch (error) {
    if (missingAffidavitSchema(error)) return [];
    throw error;
  }
}

function withoutChannelBinding(url: string) {
  return url
    .replace(/([?&])channel_binding=[^&]*/g, "$1")
    .replace("?&", "?")
    .replace(/&&/g, "&")
    .replace(/[?&]$/, "");
}

function tagKnownIds() {
  cacheTag(HOME_TAG);
  for (const leader of leaders) cacheTag(personTag(leader.slug));
  for (const entry of entries) {
    if (entry.section === "cases") cacheTag(caseTag(entry.id));
  }
  for (const seat of seats) cacheTag(constituencyTag(seat.id));
}

async function fetchRows(connectionString: string): Promise<{ rows: PublicRows; replies: PublishedReply[] }> {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: true },
  });
  await client.connect();
  try {
    const result = await client.query(query);
    const rows = result.rows[0] as PublicRows;
    rows.affidavits = await optionalRows<AffidavitRow>(client, `
      select person_slug, constituency_id, election, year, assets_inr, liabilities_inr,
        declared_cases, serious_cases, page_number, source_url, source_title, publisher,
        to_char(published_on, 'YYYY-MM-DD') as published_on
      from public.v_affidavits
    `);
    rows.affidavitChanges = await optionalRows<AffidavitChangeRow>(client, `
      select person_slug, constituency_id, earlier_affidavit_id::text, later_affidavit_id::text,
        earlier_year, later_year, assets_earlier_inr, assets_later_inr, assets_delta_inr,
        liabilities_earlier_inr, liabilities_later_inr, liabilities_delta_inr,
        declared_cases_earlier, declared_cases_later, declared_cases_delta,
        serious_cases_earlier, serious_cases_later, serious_cases_delta, label
      from public.v_affidavit_changes
    `);
    const reservations = await optionalRows<{ id: string; reservation_category: string | null }>(client, `
      select id, reservation_category from public.v_constituencies
    `);
    if (reservations.length > 0) {
      const byId = new Map(reservations.map((item) => [item.id, item.reservation_category]));
      for (const seat of rows.constituencies) {
        if (byId.has(seat.id)) seat.reservation_category = byId.get(seat.id) ?? null;
      }
    }
    const translatedCases = await optionalRows<{
      slug: string;
      title_te: string | null;
      summary_te: string | null;
    }>(client, `
      select slug, title_te, summary_te
      from public.v_cases
      where title_te is not null or summary_te is not null
    `);
    if (translatedCases.length > 0) {
      const bySlug = new Map(translatedCases.map((item) => [item.slug, item]));
      for (const item of rows.cases) {
        const translated = bySlug.get(item.slug);
        if (!translated) continue;
        item.title_te = translated.title_te;
        item.summary_te = translated.summary_te;
      }
    }
    let replies: PublishedReply[] = [];
    try {
      const replyRows = await client.query(
        "select id, external_id, office_name, body from public.v_replies",
      );
      replies = replyRows.rows.flatMap((row) => {
        if (typeof row.id !== "string" || typeof row.external_id !== "string") return [];
        if (typeof row.office_name !== "string" || typeof row.body !== "string") return [];
        return [{ id: row.id, externalId: row.external_id, officeName: row.office_name, body: row.body }];
      });
    } catch {
      replies = [];
    }
    return { rows, replies };
  } finally {
    await client.end();
  }
}

async function readRows(): Promise<{ rows: PublicRows; replies: PublishedReply[] } | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return await fetchRows(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (url.includes("channel_binding") && /channel.?binding/i.test(message)) {
      try {
        return await fetchRows(withoutChannelBinding(url));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function readPublicEdition(): Promise<Edition | null> {
  "use cache";
  cacheLife("hours");
  tagKnownIds();
  const loaded = await readRows();
  if (!loaded) return null;
  const edition = assembleEdition(loaded.rows);
  if (!edition) return null;
  edition.replies = loaded.replies;
  for (const leader of edition.leaders) cacheTag(personTag(leader.slug));
  for (const entry of edition.entries) {
    if (entry.section === "cases") cacheTag(caseTag(entry.id));
  }
  for (const seat of edition.seats) cacheTag(constituencyTag(seat.id));
  return edition;
}
