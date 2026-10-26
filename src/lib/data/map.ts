import { seats as staticSeats, type ReservationCategory, type Seat } from "../../data/constituencies";
import {
  entries as staticEntries,
  leaders as staticLeaders,
  type Entry,
  type Leader,
  type Source,
  type Tone,
} from "../../data/ledger";
import { manifestos as staticManifestos, type Manifesto, type PromiseStatus } from "../../data/manifestos";

/**
 * Reads of the compiled static edition through the public views.
 * This is not the 27/9/24 Claude register export.
 * Affidavit totals, unlinked court orders, and "Not compiled yet" quotes stay out.
 */

const entrySections = new Set<Entry["section"]>([
  "cases",
  "promises",
  "finances",
  "elections",
  "changes",
]);

const tones = new Set<Tone>(["pending", "plain", "gap"]);

const tier1 = new Set(["COURT", "CAG", "ECI", "SPKR"]);

const directStatuses: Record<string, PromiseStatus> = {
  delivered: "delivered",
  partial: "partial",
  progress: "progress",
  unverified: "unverified",
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type SourceRow = {
  id: string;
  type: string;
  url: string | null;
  title: string | null;
  publisher: string | null;
  published_on: string | null;
};

export type EntryRow = {
  person_id: string;
  external_id: string | null;
  title: string | null;
  body: string | null;
  status_line: string | null;
  section: string | null;
  tone: string | null;
  verify: boolean;
  source_id: string | null;
};

export type PersonRow = {
  id: string;
  slug: string;
  name: string;
  name_te: string | null;
  party_id: string | null;
  role: string | null;
  constituency_id: string | null;
  status_note: string | null;
};

export type PublicRows = {
  people: PersonRow[];
  parties: { id: string; name: string }[];
  entries: EntryRow[];
  sources: SourceRow[];
  cases: { slug: string; title_te?: string | null; summary_te?: string | null }[];
  promises: { external_id: string | null; current_status: string | null }[];
  constituencies: {
    id: string;
    kind: string;
    number: number;
    name: string;
    reservation_category?: string | null;
  }[];
  datasets: { key: string; data: unknown }[];
  affidavits?: AffidavitRow[];
  affidavitChanges?: AffidavitChangeRow[];
};

export type AffidavitRow = {
  person_slug: string | null;
  constituency_id: string | null;
  election: string | null;
  year: number | string | null;
  assets_inr: number | string | null;
  liabilities_inr: number | string | null;
  declared_cases: number | string | null;
  serious_cases: number | string | null;
  page_number: number | string | null;
  source_url: string | null;
  source_title: string | null;
  publisher: string | null;
  published_on: string | null;
};

export type AffidavitChangeRow = {
  person_slug: string | null;
  constituency_id: string | null;
  earlier_affidavit_id: string | null;
  later_affidavit_id: string | null;
  earlier_year: number | string | null;
  later_year: number | string | null;
  assets_earlier_inr: number | string | null;
  assets_later_inr: number | string | null;
  assets_delta_inr: number | string | null;
  liabilities_earlier_inr: number | string | null;
  liabilities_later_inr: number | string | null;
  liabilities_delta_inr: number | string | null;
  declared_cases_earlier: number | string | null;
  declared_cases_later: number | string | null;
  declared_cases_delta: number | string | null;
  serious_cases_earlier: number | string | null;
  serious_cases_later: number | string | null;
  serious_cases_delta: number | string | null;
  label: string | null;
};

export type PublishedAffidavit = {
  personSlug: string | null;
  constituencyId: string;
  election: string;
  year: number;
  assetsInr: number | null;
  liabilitiesInr: number | null;
  declaredCases: number | null;
  seriousCases: number | null;
  pageNumber: number;
  sourceUrl: string;
  sourceTitle: string;
  publisher: string;
  publishedOn: string;
};

export type PublishedAffidavitChange = {
  personSlug: string | null;
  constituencyId: string;
  earlierAffidavitId: string;
  laterAffidavitId: string;
  earlierYear: number;
  laterYear: number;
  assetsEarlierInr: number | null;
  assetsLaterInr: number | null;
  assetsDeltaInr: number | null;
  liabilitiesEarlierInr: number | null;
  liabilitiesLaterInr: number | null;
  liabilitiesDeltaInr: number | null;
  declaredCasesEarlier: number | null;
  declaredCasesLater: number | null;
  declaredCasesDelta: number | null;
  seriousCasesEarlier: number | null;
  seriousCasesLater: number | null;
  seriousCasesDelta: number | null;
  label: "Calculated by Praja Ledger";
};

export type FinanceTables = {
  budget: { unit: string; headers: string[]; rows: string[][] };
  publicDebt: { asOn: string; unit: string; rows: string[][] };
};

export type PublishedReply = {
  id: string;
  externalId: string;
  officeName: string;
  body: string;
};

export type Edition = {
  leaders: Leader[];
  entries: Entry[];
  seats: Seat[];
  manifestos: Manifesto[];
  finance: FinanceTables;
  courtOrders: { href: string; label: string }[];
  replies: PublishedReply[];
  affidavits: PublishedAffidavit[];
  affidavitChanges: PublishedAffidavitChange[];
};

export const compiledFinance: FinanceTables = {
  budget: {
    unit: "Rs crore",
    headers: ["", "2024–25 actuals", "2025–26 revised", "2026–27 budgeted"],
    rows: [
      ["Expenditure, excluding debt repayment", "2,18,251", "2,61,211", "3,01,209"],
      ["Debt repayment", "1,42,701", "20,128", "23,025"],
      ["Receipts, excluding borrowings", "1,69,329", "2,05,078", "2,42,750"],
      ["Fiscal deficit", "48,922", "56,133", "58,459"],
      ["Revenue balance", "−9,420", "591", "6,858"],
    ],
  },
  publicDebt: {
    asOn: "31 March 2025",
    unit: "Rs crore",
    rows: [
      ["Open market loans", "3,57,637.07"],
      ["Loans from the central government", "13,296.23"],
      ["Loans from autonomous bodies", "11,209.93"],
      ["Ways and means advances, including overdraft", "5,841.95"],
      ["Special securities to the National Small Savings Fund", "3,895.86"],
      ["Public debt", "3,91,881.04"],
    ],
  },
};

function normalizeUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

function formatIsoDate(value: string | null) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const month = monthNames[Number(match[2]) - 1];
  if (!month) return value;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function sourceFromRow(row: SourceRow): Source | null {
  const url = row.url?.trim() ?? "";
  if (!url) return null;
  if (tier1.has(row.type) && !url) return null;
  return {
    title: row.title?.trim() || row.publisher?.trim() || url,
    publisher: row.publisher?.trim() || "",
    date: formatIsoDate(row.published_on),
    url,
  };
}

/** A court order counts only when the public views store a COURT row with a URL. */
export function linkedCourtOrders(sources: SourceRow[]) {
  const orders: { href: string; label: string }[] = [];
  for (const source of sources) {
    if (source.type !== "COURT") continue;
    const url = source.url?.trim() ?? "";
    if (!url) continue;
    orders.push({ href: url, label: source.title?.trim() || url });
  }
  return orders;
}

function stringMatrix(value: unknown): string[][] | null {
  if (!Array.isArray(value)) return null;
  const rows: string[][] = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.some((cell) => typeof cell !== "string")) return null;
    rows.push(row);
  }
  return rows;
}

export function financeFromDataset(data: unknown): FinanceTables | null {
  if (!data || typeof data !== "object") return null;
  const record = data as { budget?: unknown; publicDebt?: unknown };
  if (!record.budget || typeof record.budget !== "object") return null;
  if (!record.publicDebt || typeof record.publicDebt !== "object") return null;
  const budget = record.budget as { unit?: unknown; headers?: unknown; rows?: unknown };
  const debt = record.publicDebt as { asOn?: unknown; unit?: unknown; rows?: unknown };
  const budgetRows = stringMatrix(budget.rows);
  const debtRows = stringMatrix(debt.rows);
  const headers = stringMatrix(budget.headers ? [budget.headers] : null)?.[0];
  if (!budgetRows || !debtRows || !headers) return null;
  if (typeof budget.unit !== "string" || typeof debt.unit !== "string" || typeof debt.asOn !== "string") {
    return null;
  }
  return {
    budget: { unit: budget.unit, headers, rows: budgetRows },
    publicDebt: { asOn: debt.asOn, unit: debt.unit, rows: debtRows },
  };
}

function sourcesForEntry(row: EntryRow, staticEntry: Entry | undefined, byId: Map<string, SourceRow>, urls: Set<string>) {
  const kept = (staticEntry?.sources ?? []).filter((source) => urls.has(normalizeUrl(source.url)));
  const linked = row.source_id ? byId.get(row.source_id) : undefined;
  const linkedSource = linked ? sourceFromRow(linked) : null;
  if (linkedSource && !kept.some((source) => normalizeUrl(source.url) === normalizeUrl(linkedSource.url))) {
    return [linkedSource, ...kept];
  }
  if (kept.length > 0) return kept;
  return linkedSource ? [linkedSource] : [];
}

function partyName(partyId: string | null, parties: Map<string, string>) {
  if (!partyId) return "Not compiled yet";
  return parties.get(partyId) ?? "Not compiled yet";
}

export function assembleEdition(rows: PublicRows): Edition | null {
  if (rows.people.length === 0) return null;

  const parties = new Map(rows.parties.map((party) => [party.id, party.name]));
  const bySourceId = new Map(rows.sources.map((source) => [source.id, source]));
  const urls = new Set(
    rows.sources.flatMap((source) => {
      const url = source.url?.trim();
      return url ? [normalizeUrl(url)] : [];
    }),
  );
  const staticById = new Map(staticEntries.map((entry) => [entry.id, entry]));
  const staticLeaderBySlug = new Map(staticLeaders.map((leader) => [leader.slug, leader]));

  const entries: Entry[] = [];
  for (const row of rows.entries) {
    const id = row.external_id?.trim();
    if (!id || !row.section || !entrySections.has(row.section as Entry["section"])) continue;
    const staticEntry = staticById.get(id);
    const tone = tones.has(row.tone as Tone) ? (row.tone as Tone) : (staticEntry?.tone ?? "plain");
    entries.push({
      id,
      section: row.section as Entry["section"],
      title: row.title?.trim() || staticEntry?.title || id,
      body: row.body?.trim() || staticEntry?.body || "",
      status: row.status_line?.trim() || staticEntry?.status || "",
      tone,
      verify: row.verify ? true : undefined,
      sources: sourcesForEntry(row, staticEntry, bySourceId, urls),
    });
  }

  for (const entry of staticEntries) {
    if (entry.section !== "changes") continue;
    if (entries.some((item) => item.id === entry.id)) continue;
    entries.push(entry);
  }

  const entryIds = new Set(entries.map((entry) => entry.id));
  const order = new Map(staticEntries.map((entry, index) => [entry.id, index]));
  entries.sort((a, b) => (order.get(a.id) ?? 1000) - (order.get(b.id) ?? 1000));

  const caseText = new Map(rows.cases.map((item) => [item.slug, item]));
  for (const entry of entries) {
    const translated = caseText.get(entry.id);
    const titleTe = translated?.title_te?.trim();
    const bodyTe = translated?.summary_te?.trim();
    if (titleTe) entry.titleTe = titleTe;
    if (bodyTe) entry.bodyTe = bodyTe;
  }

  const leaders: Leader[] = rows.people.map((person) => {
    const compiled = staticLeaderBySlug.get(person.slug);
    const recordIds: string[] = [];
    for (const id of compiled?.recordIds ?? []) {
      if (entryIds.has(id) && !recordIds.includes(id)) recordIds.push(id);
    }
    for (const row of rows.entries) {
      const id = row.external_id?.trim();
      if (!id || row.person_id !== person.id || !entryIds.has(id) || recordIds.includes(id)) continue;
      recordIds.push(id);
    }
    const note = person.status_note?.trim() || "";
    const role = person.role?.trim() || compiled?.office || "Not compiled yet";
    return {
      slug: person.slug,
      name: person.name,
      nameTe: person.name_te?.trim() || compiled?.nameTe || person.name,
      party: partyName(person.party_id, parties),
      office: role,
      partyHistory: compiled?.partyHistory ?? (note && note !== role ? note : undefined),
      summary: compiled?.summary || role,
      recordIds,
      sources: (compiled?.sources ?? []).filter((source) => urls.has(normalizeUrl(source.url))),
    };
  });

  const leaderOrder = new Map(staticLeaders.map((leader, index) => [leader.slug, index]));
  leaders.sort((a, b) => (leaderOrder.get(a.slug) ?? 1000) - (leaderOrder.get(b.slug) ?? 1000));

  const seatById = new Map(staticSeats.map((seat) => [seat.id, seat]));
  const seats = [...rows.constituencies]
    .filter((seat) => seat.kind === "AC" || seat.kind === "PC")
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "AC" ? -1 : 1;
      return a.number - b.number;
    })
    .map((seat) => {
      const compiled = seatById.get(seat.id);
      const reservationCategory = reservationOf(seat.reservation_category) ?? compiled?.reservationCategory;
      if (!compiled) {
        return {
          id: seat.id,
          kind: seat.kind as Seat["kind"],
          number: seat.number,
          name: seat.name,
          reservationCategory,
          memberName: "Not compiled yet",
          party: "Not compiled yet",
          sources: [],
        } satisfies Seat;
      }
      return {
        ...compiled,
        kind: seat.kind as Seat["kind"],
        number: seat.number,
        name: seat.name,
        reservationCategory,
      };
    });

  const promiseStatus = new Map(
    rows.promises.flatMap((promise) => {
      const id = promise.external_id?.trim();
      const status = promise.current_status ? directStatuses[promise.current_status] : undefined;
      return id && status ? [[id, status] as const] : [];
    }),
  );
  const manifestos = staticManifestos.map((manifesto) => ({
    ...manifesto,
    promises: manifesto.promises.map((promise) => {
      const status = promiseStatus.get(`${manifesto.slug}:${promise.slug}`);
      if (!status || status === promise.status) return promise;
      return { ...promise, status };
    }),
  }));

  const financeRow = rows.datasets.find((dataset) => dataset.key === "finance");
  const finance = financeFromDataset(financeRow?.data) ?? compiledFinance;

  return {
    leaders,
    entries,
    seats,
    manifestos,
    finance,
    courtOrders: linkedCourtOrders(rows.sources),
    replies: [],
    affidavits: publishedAffidavits(rows.affidavits ?? []),
    affidavitChanges: publishedChanges(rows.affidavitChanges ?? []),
  };
}

function reservationOf(value: string | null | undefined): ReservationCategory | undefined {
  if (value === "General" || value === "SC" || value === "ST") return value;
  return undefined;
}

function whole(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

function nonNegative(value: number | string | null | undefined) {
  const parsed = whole(value);
  if (parsed == null || parsed < 0) return null;
  return parsed;
}

function publishedAffidavits(rows: AffidavitRow[]): PublishedAffidavit[] {
  return rows.flatMap((row) => {
    const sourceUrl = row.source_url?.trim() ?? "";
    const pageNumber = nonNegative(row.page_number);
    const year = nonNegative(row.year);
    const constituencyId = row.constituency_id?.trim() ?? "";
    const election = row.election?.trim() ?? "";
    if (!sourceUrl.startsWith("https://") || pageNumber == null || pageNumber < 1) return [];
    if (!constituencyId || !election || year == null) return [];
    return [{
      personSlug: row.person_slug?.trim() || null,
      constituencyId,
      election,
      year,
      assetsInr: nonNegative(row.assets_inr),
      liabilitiesInr: nonNegative(row.liabilities_inr),
      declaredCases: nonNegative(row.declared_cases),
      seriousCases: nonNegative(row.serious_cases),
      pageNumber,
      sourceUrl,
      sourceTitle: row.source_title?.trim() || "",
      publisher: row.publisher?.trim() || "",
      publishedOn: row.published_on?.trim() || "",
    }];
  });
}

function publishedChanges(rows: AffidavitChangeRow[]): PublishedAffidavitChange[] {
  return rows.flatMap((row) => {
    const earlierYear = nonNegative(row.earlier_year);
    const laterYear = nonNegative(row.later_year);
    const constituencyId = row.constituency_id?.trim() ?? "";
    const earlierAffidavitId = row.earlier_affidavit_id?.trim() ?? "";
    const laterAffidavitId = row.later_affidavit_id?.trim() ?? "";
    if (row.label !== "Calculated by Praja Ledger") return [];
    if (!constituencyId || !earlierAffidavitId || !laterAffidavitId) return [];
    if (earlierYear == null || laterYear == null || earlierYear === laterYear) return [];
    return [{
      personSlug: row.person_slug?.trim() || null,
      constituencyId,
      earlierAffidavitId,
      laterAffidavitId,
      earlierYear,
      laterYear,
      assetsEarlierInr: nonNegative(row.assets_earlier_inr),
      assetsLaterInr: nonNegative(row.assets_later_inr),
      assetsDeltaInr: whole(row.assets_delta_inr),
      liabilitiesEarlierInr: nonNegative(row.liabilities_earlier_inr),
      liabilitiesLaterInr: nonNegative(row.liabilities_later_inr),
      liabilitiesDeltaInr: whole(row.liabilities_delta_inr),
      declaredCasesEarlier: nonNegative(row.declared_cases_earlier),
      declaredCasesLater: nonNegative(row.declared_cases_later),
      declaredCasesDelta: whole(row.declared_cases_delta),
      seriousCasesEarlier: nonNegative(row.serious_cases_earlier),
      seriousCasesLater: nonNegative(row.serious_cases_later),
      seriousCasesDelta: whole(row.serious_cases_delta),
      label: "Calculated by Praja Ledger",
    }];
  });
}
