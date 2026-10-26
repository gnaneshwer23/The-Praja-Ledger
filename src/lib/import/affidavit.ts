import { createHash } from "node:crypto";
import { seats, type ReservationCategory } from "../../data/constituencies";

/** A supplied file is staged. It is not published, and it is not scraped. */
export const AFFIDAVIT_STAGE_REASON =
  "Stage election affidavit rows from a file supplied by the editor. Figures stay unpublished until a different editor confirms them.";

export const CALCULATED_BY = "Calculated by Praja Ledger" as const;

const PERSONAL_KEYS = new Set([
  "health",
  "marriage",
  "spouse",
  "dependant",
  "dependent",
  "child",
  "children",
  "religion",
  "caste",
  "address",
  "phone",
  "phone_number",
  "aadhaar",
  "aadhar",
  "pan",
  "bank",
  "relationship",
  "father",
  "mother",
  "brother",
  "sister",
  "wife",
  "husband",
  "son",
  "daughter",
  "email",
  "mobile",
  "voter",
  "epic",
  "account",
  "id_number",
]);

const RESERVATION_KEYS = new Set(["reservation", "reservation_category", "reservationcategory"]);

const CHANGE_KEYS = new Set([
  "change",
  "asset_change",
  "assets_change",
  "liability_change",
  "liabilities_change",
  "delta",
  "increase",
]);

const HEADER_ALIAS: Record<string, string> = {
  constituency: "constituency",
  constituency_id: "constituency",
  seat: "constituency",
  name: "name",
  person: "name",
  candidate: "name",
  party: "party",
  party_name: "party",
  assets: "assets",
  assets_inr: "assets",
  liabilities: "liabilities",
  liabilities_inr: "liabilities",
  declared_cases: "declared_cases",
  serious_cases: "serious_cases",
  source_url: "source_url",
  url: "source_url",
  page_number: "page_number",
  page: "page_number",
  pdf_page: "page_number",
  year: "year",
  election: "election",
};

export type SeatRef = {
  id: string;
  name: string;
  memberName?: string;
  leaderSlug?: string;
};

export type StagedAffidavit = {
  rowKey: string;
  constituencyId: string;
  personName: string;
  partyName: string | null;
  personSlug: string | null;
  election: string;
  year: number;
  assetsInr: number | null;
  liabilitiesInr: number | null;
  declaredCases: number | null;
  seriousCases: number | null;
  sourceUrl: string;
  pageNumber: number;
  fileKey: string;
};

export type ConstituencyReservation = {
  constituencyId: string;
  reservationCategory: ReservationCategory;
};

export type AffidavitRejection = {
  line: number;
  reason: string;
};

export type CalculatedAffidavitChange = {
  constituencyId: string;
  personKey: string;
  earlierYear: number;
  laterYear: number;
  assetsDeltaInr: number | null;
  liabilitiesDeltaInr: number | null;
  declaredCasesDelta: number | null;
  seriousCasesDelta: number | null;
  label: typeof CALCULATED_BY;
};

export type AffidavitPlan = {
  fileKey: string;
  rows: StagedAffidavit[];
  constituencies: ConstituencyReservation[];
  changes: CalculatedAffidavitChange[];
  rejected: AffidavitRejection[];
};

export function affidavitFileDecision(name: string): "import" | "adr" | "skip" {
  const base = name.toLowerCase();
  if (base.includes("adr") || base.includes("myneta")) return "adr";
  if (base.endsWith(".csv") && base.includes("affidavit")) return "import";
  return "skip";
}

export function fileKeyFor(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function planAffidavitImport(csv: string, seatList: SeatRef[], fileKey: string): AffidavitPlan {
  const rejected: AffidavitRejection[] = [];
  if (!/^[0-9a-f]{64}$/.test(fileKey)) {
    return { fileKey, rows: [], constituencies: [], changes: [], rejected: [{ line: 1, reason: "invalid file" }] };
  }
  const table = parseCsv(csv.replace(/^\uFEFF/, ""));
  if (table.length === 0) {
    return { fileKey, rows: [], constituencies: [], changes: [], rejected: [{ line: 1, reason: "no rows" }] };
  }
  const header = table[0].map((cell) => normalizeHeader(cell));
  const personal = header.find((cell) => PERSONAL_KEYS.has(cell));
  if (personal) {
    return {
      fileKey,
      rows: [],
      constituencies: [],
      changes: [],
      rejected: [{ line: 1, reason: "personal data" }],
    };
  }
  const columns = header.map((cell) => HEADER_ALIAS[cell] ?? (RESERVATION_KEYS.has(cell) ? "reservation" : cell));
  const rows: StagedAffidavit[] = [];
  const seen = new Set<string>();
  const reservations = new Map<string, ReservationCategory>();
  for (let index = 1; index < table.length; index += 1) {
    const line = table[index];
    if (line.every((cell) => cell.trim() === "")) continue;
    const record = recordFrom(columns, line);
    const changeCell = changeValue(header, line);
    if (changeCell) {
      rejected.push({ line: index + 1, reason: "single affidavit change" });
      continue;
    }
    const built = buildRow(record, seatList, fileKey, index + 1);
    if ("reason" in built) {
      rejected.push({ line: index + 1, reason: built.reason });
      continue;
    }
    if (reservations.has(built.reservation.constituencyId) && built.reservation.category) {
      const prior = reservations.get(built.reservation.constituencyId);
      if (prior && prior !== built.reservation.category) {
        rejected.push({ line: index + 1, reason: "reservation differs" });
        continue;
      }
    }
    if (built.reservation.category) {
      reservations.set(built.reservation.constituencyId, built.reservation.category);
    }
    if (seen.has(built.row.rowKey)) continue;
    seen.add(built.row.rowKey);
    rows.push(built.row);
  }
  return {
    fileKey,
    rows,
    constituencies: [...reservations.entries()].map(([constituencyId, reservationCategory]) => ({
      constituencyId,
      reservationCategory,
    })),
    changes: changesForRows(rows),
    rejected,
  };
}

export function mergeStage(existing: ReadonlyMap<string, string>, rows: readonly StagedAffidavit[]) {
  const ids = new Map(existing);
  const inserted: string[] = [];
  const unchanged: string[] = [];
  for (const row of rows) {
    const prior = ids.get(row.rowKey);
    if (prior) {
      unchanged.push(prior);
      continue;
    }
    const id = `new:${row.rowKey}`;
    ids.set(row.rowKey, id);
    inserted.push(id);
  }
  return { ids, inserted, unchanged };
}

export function knownSeats(): SeatRef[] {
  return seats.map((seat) => ({
    id: seat.id,
    name: seat.name,
    memberName: seat.memberName,
    leaderSlug: seat.leaderSlug,
  }));
}

export function changesForRows(rows: readonly StagedAffidavit[]): CalculatedAffidavitChange[] {
  const groups = new Map<string, StagedAffidavit[]>();
  for (const row of rows) {
    const key = `${row.fileKey}|${row.constituencyId}|${nameKey(row.personName)}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  const changes: CalculatedAffidavitChange[] = [];
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => a.year - b.year);
    for (let index = 1; index < ordered.length; index += 1) {
      const earlier = ordered[index - 1];
      const later = ordered[index];
      if (earlier.year === later.year) continue;
      changes.push({
        constituencyId: later.constituencyId,
        personKey: nameKey(later.personName),
        earlierYear: earlier.year,
        laterYear: later.year,
        assetsDeltaInr: delta(earlier.assetsInr, later.assetsInr),
        liabilitiesDeltaInr: delta(earlier.liabilitiesInr, later.liabilitiesInr),
        declaredCasesDelta: delta(earlier.declaredCases, later.declaredCases),
        seriousCasesDelta: delta(earlier.seriousCases, later.seriousCases),
        label: CALCULATED_BY,
      });
    }
  }
  return changes.filter((change) =>
    change.assetsDeltaInr != null
    || change.liabilitiesDeltaInr != null
    || change.declaredCasesDelta != null
    || change.seriousCasesDelta != null,
  );
}

function buildRow(
  record: Record<string, string>,
  seatList: SeatRef[],
  fileKey: string,
  _line: number,
): { row: StagedAffidavit; reservation: { constituencyId: string; category: ReservationCategory | null } } | { reason: string } {
  for (const [key, value] of Object.entries(record)) {
    if (key === "source_url" || key === "reservation") continue;
    if (value && containsPersonal(value)) return { reason: "personal data" };
  }
  const seat = resolveSeat(record.constituency ?? "", seatList);
  if (!seat) return { reason: "constituency not found" };
  const personName = (record.name ?? "").trim();
  if (!personName) return { reason: "name required" };
  const sourceUrl = (record.source_url ?? "").trim();
  if (!sourceUrl.startsWith("https://")) return { reason: "source url required" };
  const pageNumber = wholeNumber(record.page_number ?? "");
  if (pageNumber == null || pageNumber < 1) return { reason: "page number required" };
  const year = wholeNumber(record.year ?? "");
  if (year == null || year < 1950 || year > 2100) return { reason: "year required" };
  const election = (record.election ?? "").trim();
  if (!election) return { reason: "election required" };
  const assets = optionalNumber(record.assets ?? "");
  if (assets === "invalid") return { reason: "invalid amount" };
  const liabilities = optionalNumber(record.liabilities ?? "");
  if (liabilities === "invalid") return { reason: "invalid amount" };
  const declaredCases = optionalNumber(record.declared_cases ?? "");
  if (declaredCases === "invalid") return { reason: "invalid amount" };
  const seriousCases = optionalNumber(record.serious_cases ?? "");
  if (seriousCases === "invalid") return { reason: "invalid amount" };
  const category = reservationOf(record.reservation ?? "");
  if ((record.reservation ?? "").trim() && !category) return { reason: "invalid reservation" };
  const party = (record.party ?? "").trim();
  const partyName = !party || party.toLowerCase() === "not compiled yet" ? null : party;
  const personSlug = slugFor(seat, personName);
  const row: StagedAffidavit = {
    rowKey: `${seat.id}|${nameKey(personName)}|${year}|${sourceUrl}|${pageNumber}`,
    constituencyId: seat.id,
    personName,
    partyName,
    personSlug,
    election,
    year,
    assetsInr: assets,
    liabilitiesInr: liabilities,
    declaredCases,
    seriousCases,
    sourceUrl,
    pageNumber,
    fileKey,
  };
  return { row, reservation: { constituencyId: seat.id, category } };
}

function slugFor(seat: SeatRef, personName: string) {
  if (!seat.leaderSlug || !seat.memberName) return null;
  if (nameKey(personName) !== nameKey(seat.memberName)) return null;
  return seat.leaderSlug;
}

function resolveSeat(value: string, seatList: SeatRef[]) {
  const text = value.trim();
  if (!text) return undefined;
  const byId = seatList.find((seat) => seat.id.toLowerCase() === text.toLowerCase());
  if (byId) return byId;
  const key = nameKey(text);
  return seatList.find((seat) => nameKey(seat.name) === key);
}

function reservationOf(value: string): ReservationCategory | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  if (text === "general") return "General";
  if (text === "sc") return "SC";
  if (text === "st") return "ST";
  return null;
}

function changeValue(header: string[], line: string[]) {
  for (let index = 0; index < header.length; index += 1) {
    if (!CHANGE_KEYS.has(header[index])) continue;
    if ((line[index] ?? "").trim()) return (line[index] ?? "").trim();
  }
  return "";
}

function recordFrom(columns: string[], line: string[]) {
  const record: Record<string, string> = {};
  columns.forEach((column, index) => {
    if (!HEADER_ALIAS[column] && column !== "reservation") return;
    record[column] = line[index] ?? "";
  });
  return record;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function nameKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function containsPersonal(value: string) {
  const text = value.toLowerCase();
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return true;
  if (/(^|[^\d])\d{10}([^\d]|$)/.test(text)) return true;
  return /\b(aadhaar|aadhar|pan|bank|phone|mobile|address|religion|caste|voter|epic)\b/i.test(text);
}

function wholeNumber(value: string) {
  const text = value.trim().replaceAll(",", "").replace(/^₹/, "");
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) return null;
  return parsed;
}

function optionalNumber(value: string): number | null | "invalid" {
  if (!value.trim()) return null;
  const parsed = wholeNumber(value);
  if (parsed == null) return "invalid";
  return parsed;
}

function delta(earlier: number | null, later: number | null) {
  if (earlier == null || later == null) return null;
  return later - earlier;
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      cell = "";
      if (row.some((item) => item.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((item) => item.trim() !== "")) rows.push(row);
  }
  return rows;
}
