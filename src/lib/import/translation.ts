import { hasBlockedWording } from "../schemas/editorial";

/** A translator file is staged. It is not published until a different person approves it. */
export const TRANSLATION_STAGE_REASON =
  "Stage Telugu text from a file a translator supplied. The line stays unpublished until a different person approves it.";

export const translationKinds = ["person", "case", "promise", "message"] as const;
export type TranslationKind = (typeof translationKinds)[number];

const fieldsForKind: Record<TranslationKind, readonly string[]> = {
  person: ["name_te"],
  case: ["title_te", "summary_te"],
  promise: ["body_te"],
  message: ["text"],
};

const messageKey = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;
const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const phonePattern = /(^|[^0-9])[0-9]{10}([^0-9]|$)/;
const personalPattern = /\b(aadhaar|aadhar|pan|bank|phone|mobile|address|religion|caste|voter|epic)\b/i;

export type WorklistRow = {
  kind: TranslationKind;
  key: string;
  field: string;
  english: string;
  telugu: string;
  note: "todo-review" | "missing";
};

export type StagedTranslation = {
  kind: TranslationKind;
  key: string;
  field: string;
  telugu: string;
  reason: string;
};

export type TranslationRejection = {
  line: number;
  code: string;
};

export type GapInput = {
  people: { slug: string; name: string; nameTe: string | null }[];
  cases: {
    slug: string;
    title: string;
    summary: string | null;
    titleTe: string | null;
    summaryTe: string | null;
  }[];
  promises: { key: string; body: string; bodyTe: string | null }[];
};

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") {
    return prefix ? { [prefix]: value } : {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Record<string, string>>((acc, [key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return { ...acc, ...flatten(child, next) };
  }, {});
}

function blank(value: string | null | undefined) {
  return !value || value.trim() === "";
}

function isKind(value: string): value is TranslationKind {
  return (translationKinds as readonly string[]).includes(value);
}

export function hasPersonalData(value: string) {
  return emailPattern.test(value) || phonePattern.test(value) || personalPattern.test(value);
}

/** Message keys stay on the list while te.json is still marked TODO-review. */
export function messageReviewRows(english: unknown, telugu: unknown): WorklistRow[] {
  if (!telugu || typeof telugu !== "object" || Array.isArray(telugu)) return [];
  if ((telugu as { _status?: unknown })._status !== "TODO-review") return [];
  const en = flatten(english);
  const te = flatten(telugu);
  return [...new Set([...Object.keys(en), ...Object.keys(te)])]
    .filter((key) => key !== "_status")
    .sort()
    .map((key) => ({
      kind: "message" as const,
      key,
      field: "text",
      english: en[key] ?? "",
      telugu: te[key] ?? "",
      note: "todo-review" as const,
    }));
}

/** People, cases, and promises whose Telugu field is still empty. */
export function recordGaps(input: GapInput): WorklistRow[] {
  const rows: WorklistRow[] = [];
  for (const person of input.people) {
    if (!blank(person.nameTe)) continue;
    rows.push({
      kind: "person",
      key: person.slug,
      field: "name_te",
      english: person.name,
      telugu: "",
      note: "missing",
    });
  }
  for (const item of input.cases) {
    if (blank(item.titleTe)) {
      rows.push({
        kind: "case",
        key: item.slug,
        field: "title_te",
        english: item.title,
        telugu: "",
        note: "missing",
      });
    }
    if (!blank(item.summary) && blank(item.summaryTe)) {
      rows.push({
        kind: "case",
        key: item.slug,
        field: "summary_te",
        english: item.summary ?? "",
        telugu: "",
        note: "missing",
      });
    }
  }
  for (const promise of input.promises) {
    if (!blank(promise.bodyTe) || blank(promise.key)) continue;
    rows.push({
      kind: "promise",
      key: promise.key,
      field: "body_te",
      english: promise.body,
      telugu: "",
      note: "missing",
    });
  }
  return rows;
}

export function gapRows(
  rows: { kind: string; entity_key: string; field: string; english: string | null }[],
): WorklistRow[] {
  const list: WorklistRow[] = [];
  for (const row of rows) {
    const english = row.english ?? "";
    if (row.kind === "person" && row.field === "name_te") {
      list.push({ kind: "person", key: row.entity_key, field: "name_te", english, telugu: "", note: "missing" });
    } else if (row.kind === "case" && (row.field === "title_te" || row.field === "summary_te")) {
      list.push({ kind: "case", key: row.entity_key, field: row.field, english, telugu: "", note: "missing" });
    } else if (row.kind === "promise" && row.field === "body_te") {
      list.push({ kind: "promise", key: row.entity_key, field: "body_te", english, telugu: "", note: "missing" });
    }
  }
  return list;
}

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

export function worklistCsv(rows: WorklistRow[]) {
  const lines = ["kind,key,field,english,telugu,note"];
  for (const row of rows) {
    lines.push([row.kind, row.key, row.field, row.english, row.telugu, row.note].map(csvCell).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function parseCsv(text: string) {
  const rows: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  const src = text.replace(/^\uFEFF/, "");
  const pushRow = () => {
    if (cells.some((item) => item.trim() !== "") || cell.trim() !== "") {
      cells.push(cell);
      rows.push({ line, cells });
    }
    cells = [];
    cell = "";
  };
  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];
    if (quoted) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
        if (char === "\n") line += 1;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      cells.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && src[i + 1] === "\n") i += 1;
      pushRow();
      line += 1;
      continue;
    }
    cell += char;
  }
  if (cell.length > 0 || cells.length > 0) pushRow();
  return rows;
}

function headerIndex(header: string[], name: string) {
  return header.findIndex((item) => item.trim().toLowerCase() === name);
}

export function parseTranslatorCsv(text: string, defaultReason: string) {
  const table = parseCsv(text);
  const header = table[0]?.cells ?? [];
  const kindAt = headerIndex(header, "kind");
  const keyAt = headerIndex(header, "key");
  const fieldAt = headerIndex(header, "field");
  const teluguAt = headerIndex(header, "telugu");
  const reasonAt = headerIndex(header, "reason");
  const rows: StagedTranslation[] = [];
  const rejections: TranslationRejection[] = [];
  if (kindAt < 0 || keyAt < 0 || fieldAt < 0 || teluguAt < 0) {
    return { rows, rejections: [{ line: table[0]?.line ?? 1, code: "record" }] };
  }
  if (table.length > 2001) {
    return { rows, rejections: [{ line: 2002, code: "record" }] };
  }
  for (const record of table.slice(1)) {
    const kind = (record.cells[kindAt] ?? "").trim();
    const key = (record.cells[keyAt] ?? "").trim();
    const field = (record.cells[fieldAt] ?? "").trim();
    const telugu = (record.cells[teluguAt] ?? "").trim();
    const reason = (reasonAt >= 0 ? record.cells[reasonAt] ?? "" : "").trim() || defaultReason.trim();
    if (!telugu) {
      rejections.push({ line: record.line, code: "telugu" });
      continue;
    }
    if (!isKind(kind) || !fieldsForKind[kind].includes(field)) {
      rejections.push({ line: record.line, code: "record" });
      continue;
    }
    if (kind === "message" && !messageKey.test(key)) {
      rejections.push({ line: record.line, code: "record" });
      continue;
    }
    if (!key || key.length > 200 || telugu.length > 8000) {
      rejections.push({ line: record.line, code: "record" });
      continue;
    }
    if (hasBlockedWording(telugu, kind === "case" ? "COURT" : "")) {
      rejections.push({ line: record.line, code: "wording" });
      continue;
    }
    if (!reason) {
      rejections.push({ line: record.line, code: "reason" });
      continue;
    }
    if (hasBlockedWording(reason, "")) {
      rejections.push({ line: record.line, code: "wording" });
      continue;
    }
    if (hasPersonalData(telugu) || hasPersonalData(reason)) {
      rejections.push({ line: record.line, code: "personal" });
      continue;
    }
    rows.push({ kind, key, field, telugu, reason });
  }
  return { rows, rejections };
}
