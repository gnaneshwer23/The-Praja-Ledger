import { createHash } from "node:crypto";

/** Public views only. Contact emails, drafts, and audit payloads are not columns. */
export const PUBLIC_VIEWS = [
  "case_stages",
  "cases",
  "changelog",
  "constituencies",
  "datasets",
  "entries",
  "parties",
  "people",
  "promises",
  "replies",
  "snapshots",
  "sources",
] as const;

export type PublicView = (typeof PUBLIC_VIEWS)[number];

export const PUBLIC_COLUMNS = {
  case_stages: ["case_id", "idx", "label"],
  cases: ["id", "slug", "title", "summary", "party_id", "state", "events"],
  changelog: ["id", "at", "actor_name", "table_name", "row_id", "action", "reason"],
  constituencies: ["id", "kind", "number", "name", "name_te", "district"],
  datasets: ["key", "data", "source_ids", "updated_at"],
  entries: ["id", "person_id", "kind", "body", "body_te", "source_id", "verify", "status", "created_at", "updated_at", "external_id", "title", "status_line", "section", "tone"],
  parties: ["id", "name", "name_te"],
  people: ["id", "slug", "name", "name_te", "party_id", "role", "constituency_id", "status_note", "created_at", "updated_at"],
  promises: ["id", "manifesto", "party_id", "area", "body", "body_te", "sort", "current_status", "detail", "source_id", "verify", "updated_at", "external_id", "title"],
  replies: ["id", "external_id", "office_name", "body", "created_at"],
  snapshots: ["id", "taken_at", "storage_path", "sha256", "prev_sha256"],
  sources: ["id", "type", "url", "title", "publisher", "published_on"],
} as const satisfies Record<PublicView, readonly string[]>;

const EVENT_COLUMNS = ["id", "stage_idx", "event_date", "note", "source_id", "created_at"] as const;

const PRIVATE_KEYS = new Set([
  "contact_email",
  "office_email",
  "ip_hash",
  "address",
  "phone",
  "phone_number",
  "family",
  "family_details",
]);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type PublicRow = Record<string, unknown>;
export type RegisterDocument = Record<PublicView, PublicRow[]>;

export type SnapshotRow = {
  id: string;
  takenAt: string;
  storagePath: string;
  sha256: string;
  prevSha256: string | null;
};

const VIEW_NAMES = new Set<string>(PUBLIC_VIEWS);

export function isPublicView(value: string): value is PublicView {
  return VIEW_NAMES.has(value);
}

/** File names served under /data. Anything else, including private tables, is refused. */
export function publicFileKind(file: string): "hashes" | "register" | PublicView | null {
  if (file === "hashes.txt") return "hashes";
  if (file === "register.json") return "register";
  const match = /^([a-z][a-z0-9_]*)\.csv$/.exec(file);
  if (!match || !isPublicView(match[1])) return null;
  return match[1];
}

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

export function sha256Hex(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function snapshotBody(input: unknown): string {
  return canonicalJson(buildRegister(input));
}

export function registerFile(register: RegisterDocument) {
  const body = canonicalJson(register);
  return { body, sha256: sha256Hex(body) };
}

export function buildRegister(input: unknown): RegisterDocument {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const document = {} as RegisterDocument;
  for (const view of PUBLIC_VIEWS) {
    const rows = Array.isArray(source[view]) ? source[view] : [];
    document[view] = rows.flatMap((row) => {
      const projected = projectRow(view, row);
      return projected ? [projected] : [];
    });
  }
  return document;
}

export function toCsv(view: PublicView, rows: readonly PublicRow[]): string {
  const columns = PUBLIC_COLUMNS[view];
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function formatHashChain(rows: readonly { sha256: string; storagePath: string }[]): string {
  if (rows.length === 0) return "";
  return rows.map((row) => `${row.sha256}  ${row.storagePath}\n`).join("");
}

export function utcSnapshotPath(now = new Date()): string {
  return `snapshots/${now.toISOString().slice(0, 10)}.json`;
}

export function labelFromSnapshotPath(storagePath: string): string | null {
  const match = /^snapshots\/(\d{4})-(\d{2})-(\d{2})\.json$/.exec(storagePath);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return null;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function snapshotObjectName(storagePath: string): string | null {
  const match = /^snapshots\/(\d{4}-\d{2}-\d{2}\.json)$/.exec(storagePath);
  if (!match || !labelFromSnapshotPath(storagePath)) return null;
  return match[1];
}

export function cronAuthorized(secret: string | undefined, header: string | null): boolean {
  const trimmed = secret?.trim() ?? "";
  if (!trimmed) return false;
  return header === `Bearer ${trimmed}`;
}

function projectRow(view: PublicView, value: unknown): PublicRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (view === "entries" && raw.status !== "published") return null;
  if (view === "replies" && "status" in raw && raw.status !== "published") return null;
  if (view === "cases") {
    const events = projectEvents(raw.events);
    if (!events || events.length === 0) return null;
    raw.events = events;
  }
  const row: PublicRow = {};
  for (const column of PUBLIC_COLUMNS[view]) {
    row[column] = projectCell(column, raw[column]);
  }
  return row;
}

function projectEvents(value: unknown): PublicRow[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const raw = item as Record<string, unknown>;
    if ("status" in raw && raw.status !== "published") return [];
    const event: PublicRow = {};
    for (const column of EVENT_COLUMNS) event[column] = projectCell(column, raw[column]);
    return [event];
  });
}

function projectCell(column: string, value: unknown): unknown {
  if (column === "data") return stripPrivate(value);
  if (column === "events" && Array.isArray(value)) return value.map((item) => stripPrivate(item));
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  return value === undefined ? null : value;
}

function stripPrivate(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stripPrivate(item));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PRIVATE_KEYS.has(key)) continue;
    out[key] = stripPrivate(child);
  }
  return out;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const child = (value as Record<string, unknown>)[key];
    if (child === undefined) continue;
    out[key] = canonicalize(child);
  }
  return out;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string"
    ? value
    : typeof value === "object"
      ? canonicalJson(value).trimEnd()
      : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
