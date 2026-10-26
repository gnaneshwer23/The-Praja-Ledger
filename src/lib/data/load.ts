import { cacheLife, cacheTag } from "next/cache";
import pg from "pg";
import { entries, leaders } from "../../data/ledger";
import { seats } from "../../data/constituencies";
import { assembleEdition, type Edition, type PublicRows } from "./map";
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

async function fetchRows(connectionString: string): Promise<PublicRows> {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: true },
  });
  await client.connect();
  try {
    const result = await client.query(query);
    return result.rows[0] as PublicRows;
  } finally {
    await client.end();
  }
}

async function readRows(): Promise<PublicRows | null> {
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
  const rows = await readRows();
  if (!rows) return null;
  const edition = assembleEdition(rows);
  if (!edition) return null;
  for (const leader of edition.leaders) cacheTag(personTag(leader.slug));
  for (const entry of edition.entries) {
    if (entry.section === "cases") cacheTag(caseTag(entry.id));
  }
  for (const seat of edition.seats) cacheTag(constituencyTag(seat.id));
  return edition;
}
