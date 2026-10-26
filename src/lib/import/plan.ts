import { seats } from "../../data/constituencies";
import { entries, leaders, type Entry, type Source } from "../../data/ledger";
import { manifestos, type ManifestoPromise, type PromiseStatus } from "../../data/manifestos";

/**
 * Plan for the compiled static edition.
 * This is not the Claude register export. Do not pad counts to 27 / 9 / 24.
 */
export const IMPORT_REASON =
  "Initial import of the compiled static edition, 25 Oct 2026. The Claude register export was not in supabase/seed/register.json.";

export const EDITOR_ID = "a1111111-1111-4111-8111-111111111111";
export const REVIEWER_ID = "a2222222-2222-4222-8222-222222222222";

export type DbSourceType =
  | "COURT"
  | "CAG"
  | "ECI"
  | "SPKR"
  | "COMM"
  | "MEDIA"
  | "GOV"
  | "OPP"
  | "PARTY";

export type DbPromiseStatus =
  | "delivered"
  | "partial"
  | "not"
  | "disputed"
  | "progress"
  | "unverified";

export type PlannedSource = {
  key: string;
  type: DbSourceType;
  url: string;
  title: string;
  publisher: string;
  publishedOn: string | null;
};

export type Skip = {
  kind: string;
  title: string;
  reason: string;
};

export type PlannedEntry = {
  externalId: string;
  personSlug: string;
  casePeople: string[];
  kind: "work" | "issue";
  body: string;
  title: string;
  statusLine: string;
  section: Entry["section"];
  tone: string;
  verify: boolean;
  sourceKey: string;
  sourceKeys: string[];
};

export type PlannedCase = {
  slug: string;
  title: string;
  summary: string;
  partyId: string | null;
  state: "pending" | "final" | "unknown";
  stageLabel: string;
  eventNote: string;
  eventDate: string | null;
  sourceKey: string;
  people: string[];
};

export type PlannedPromise = {
  externalId: string;
  manifesto: string;
  partyId: string;
  area: string;
  body: string;
  title: string;
  sort: number;
  status: DbPromiseStatus;
  detail: string | null;
  sourceKey: string | null;
};

const mediaPublishers = [
  "The Times of India",
  "The Hindu",
  "Press Trust of India",
  "Siasat",
  "The Indian Express",
  "Deccan Chronicle",
  "ThePrint",
  "The Hans India",
  "Business Standard",
  "The News Minute",
  "The South First",
  "The New Indian Express",
];

const months: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const withheldCourtOrders: Skip[] = [
  {
    kind: "tier-1",
    title: "Telangana High Court order disqualifying Danam Nagender, 18 Sep 2026",
    reason: "Court order PDF is not linked. No URL was invented.",
  },
  {
    kind: "tier-1",
    title: "Supreme Court order of 24 Sep 2026 on the Danam Nagender disqualification",
    reason: "Court order PDF is not linked. No URL was invented.",
  },
  {
    kind: "tier-1",
    title: "Special Court acquittal of Akbaruddin Owaisi, 13 Apr 2022",
    reason: "Judgment PDF is not linked. No case row and no URL were invented.",
  },
  {
    kind: "tier-1",
    title: "Telangana High Court order on the Kaleshwaram commission report",
    reason:
      "The order PDF is not linked. The Hans India report is imported as a media source, not as a court order.",
  },
];

export function publishedOn(date: string): string | null {
  const text = date.trim();
  if (/^read\b/i.test(text)) return null;
  const match = text.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = months[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (!month || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function partyIdFor(party: string): string | null {
  if (party === "Congress") return "congress";
  if (party === "BRS") return "brs";
  if (party === "BJP") return "bjp";
  if (party === "AIMIM") return "aimim";
  return null;
}

function sourceKey(type: DbSourceType, url: string, title: string) {
  return `${type}|${url}|${title}`;
}

export function classifySource(source: Source):
  | { action: "import"; type: DbSourceType; url: string }
  | { action: "skip"; reason: string } {
  const url = source.url?.trim() ?? "";
  const publisher = source.publisher;
  const title = source.title;
  const media = mediaPublishers.some((name) => publisher.includes(name));

  if (media) {
    if (!url) return { action: "skip", reason: `Media source has no URL: ${title}` };
    return { action: "import", type: "MEDIA", url };
  }

  if (publisher.includes("Election Commission of India")) {
    if (!url) return { action: "skip", reason: `Tier-1 ECI source has no URL: ${title}` };
    return { action: "import", type: "ECI", url };
  }

  if (/comptroller|auditor general|\bCAG\b/i.test(`${publisher} ${title}`)) {
    if (!url) return { action: "skip", reason: `Tier-1 CAG source has no URL: ${title}` };
    return { action: "import", type: "CAG", url };
  }

  if (/speaker/i.test(publisher) && /order/i.test(title)) {
    if (!url) return { action: "skip", reason: `Tier-1 speaker source has no URL: ${title}` };
    return { action: "import", type: "SPKR", url };
  }

  if (publisher === "PRS Legislative Research") {
    if (!url) return { action: "skip", reason: `PRS source has no URL: ${title}` };
    return { action: "import", type: "COMM", url };
  }

  if (
    publisher.includes("Government of Telangana") ||
    publisher.includes("Ministry of") ||
    publisher === "Lok Sabha"
  ) {
    if (!url) return { action: "skip", reason: `Government source has no URL: ${title}` };
    return { action: "import", type: "GOV", url };
  }

  if (!url) return { action: "skip", reason: `Source has no URL: ${title}` };
  return { action: "import", type: "MEDIA", url };
}

function promiseEnum(status: PromiseStatus): DbPromiseStatus {
  if (status === "notStarted" || status === "dropped") return "not";
  return status;
}

function promiseBody(promise: ManifestoPromise) {
  if (promise.achieved) return promise.achieved;
  if (promise.context) return promise.context;
  const primary = promise.history.find((event) => event.detail.trim());
  if (primary) return primary.detail;
  return `${promise.measure}. ${promise.target}`;
}

function promiseUpdate(promise: ManifestoPromise) {
  if (promise.slug === "cheyutha-pension") {
    return (
      promise.history.find(
        (event) =>
          event.source?.url.includes("Socio-Economic-Outlook-2026") &&
          /monthly amount|not compiled/i.test(event.detail),
      ) ?? null
    );
  }
  return promise.history.find((event) => event.source) ?? null;
}

function entryKind(entry: Entry): "work" | "issue" {
  if (entry.section === "cases" || entry.id.startsWith("PL-I-") || entry.id.startsWith("PL-C-")) {
    return "issue";
  }
  return "work";
}

function caseState(id: string): "pending" | "final" | "unknown" {
  if (id === "PL-C-01" || id === "PL-C-04") return "pending";
  return "unknown";
}

const financeRows = {
  budget: {
    unit: "Rs crore",
    headers: ["", "2024–25 actuals", "2025–26 revised", "2026–27 budgeted"],
    rows: [
      ["GSDP", "16,09,279", "17,82,004", "19,61,701"],
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

export function buildPlan() {
  const skips: Skip[] = [...withheldCourtOrders];
  skips.push({
    kind: "affidavit",
    title: "Election affidavit totals",
    reason: "Affidavit totals are not published. No affidavit row is imported.",
  });
  skips.push({
    kind: "party",
    title: "K. Kavitha",
    reason: "Party name is not compiled yet. people.party_id stays empty.",
  });
  skips.push({
    kind: "cheyutha",
    title: "Cheyutha current monthly amount",
    reason: "The current monthly amount is not compiled yet. The 2023 Warangal figure is not stored as the 2026 amount.",
  });
  skips.push({
    kind: "manifesto-quote",
    title: "Congress 2023 manifesto quotes",
    reason: "Each quote is not compiled yet. No quote text is imported.",
  });

  const sources = new Map<string, PlannedSource>();

  function addSource(source: Source): string | null {
    const classified = classifySource(source);
    if (classified.action === "skip") {
      skips.push({ kind: "source", title: source.title, reason: classified.reason });
      return null;
    }
    if (
      (classified.type === "COURT" ||
        classified.type === "CAG" ||
        classified.type === "ECI" ||
        classified.type === "SPKR") &&
      !classified.url
    ) {
      skips.push({
        kind: "tier-1",
        title: source.title,
        reason: "Tier-1 source has no URL. It was not given a stand-in URL.",
      });
      return null;
    }
    const key = sourceKey(classified.type, classified.url, source.title);
    if (!sources.has(key)) {
      sources.set(key, {
        key,
        type: classified.type,
        url: classified.url,
        title: source.title,
        publisher: source.publisher,
        publishedOn: publishedOn(source.date),
      });
    }
    return key;
  }

  const seatByLeader = new Map<string, (typeof seats)[number]>();
  for (const seat of seats) {
    if (seat.leaderSlug && !seatByLeader.has(seat.leaderSlug)) {
      seatByLeader.set(seat.leaderSlug, seat);
    }
  }

  const people = leaders.map((leader) => {
    const seat = seatByLeader.get(leader.slug);
    const notes = [
      leader.office.toLowerCase().includes("vacant") ? leader.office : null,
      leader.partyHistory ?? null,
    ].filter((item): item is string => Boolean(item));
    return {
      slug: leader.slug,
      name: leader.name,
      nameTe: leader.nameTe,
      partyId: partyIdFor(leader.party),
      role: leader.office,
      constituencyId: seat?.id ?? null,
      statusNote: notes.length > 0 ? notes.join(" ") : null,
    };
  });

  const parties = [
    { id: "congress", name: "Congress" },
    { id: "brs", name: "BRS" },
    { id: "bjp", name: "BJP" },
    { id: "aimim", name: "AIMIM" },
  ];

  const constituencies = seats.map((seat) => ({
    id: seat.id,
    kind: seat.kind,
    number: seat.number,
    name: seat.name,
  }));

  for (const seat of seats) {
    for (const source of seat.sources) addSource(source);
  }

  const plannedEntries: PlannedEntry[] = [];
  for (const entry of entries) {
    if (entry.sources.length === 0) {
      skips.push({
        kind: "entry",
        title: entry.id,
        reason: "The line has no source, so it was not imported.",
      });
      continue;
    }
    const sourceKeys = entry.sources
      .map((source) => addSource(source))
      .filter((key): key is string => Boolean(key));
    if (sourceKeys.length === 0) {
      skips.push({
        kind: "entry",
        title: entry.id,
        reason: "Every source on this line was skipped.",
      });
      continue;
    }
    const linked = leaders.filter((leader) => leader.recordIds.includes(entry.id)).map((leader) => leader.slug);
    let personSlug = linked[0];
    if (!personSlug && entry.section === "finances") personSlug = "bhatti-vikramarka-mallu";
    if (!personSlug) personSlug = "revanth-reddy";
    plannedEntries.push({
      externalId: entry.id,
      personSlug,
      casePeople: linked.length > 0 ? linked : [personSlug],
      kind: entryKind(entry),
      body: entry.body,
      title: entry.title,
      statusLine: entry.status,
      section: entry.section,
      tone: entry.tone,
      verify: entry.verify === true,
      sourceKey: sourceKeys[0],
      sourceKeys,
    });
  }

  const plannedCases: PlannedCase[] = [];
  for (const entry of plannedEntries) {
    if (!entry.externalId.startsWith("PL-C-")) continue;
    const primary = people.find((person) => person.slug === entry.personSlug);
    const source = sources.get(entry.sourceKey);
    plannedCases.push({
      slug: entry.externalId,
      title: entry.title,
      summary: entry.body,
      partyId: primary?.partyId ?? null,
      state: caseState(entry.externalId),
      stageLabel: entry.statusLine,
      eventNote: entry.statusLine,
      eventDate: source?.publishedOn ?? null,
      sourceKey: entry.sourceKey,
      people: entry.casePeople,
    });
  }

  const plannedPromises: PlannedPromise[] = [];
  for (const manifesto of manifestos) {
    manifesto.promises.forEach((promise, index) => {
      if (promise.quote && promise.quote.trim() && promise.quote.trim() !== "Not compiled yet") {
        skips.push({
          kind: "manifesto-quote",
          title: promise.title,
          reason: "A compiled quote was left out of this importer until the PDF page is cited. This edition has no such quote.",
        });
      }
      const body = promiseBody(promise);
      if (!body.trim() || body.trim().toLowerCase() === "not compiled yet") {
        skips.push({
          kind: "promise",
          title: promise.title,
          reason: "Promise body is not compiled yet.",
        });
        return;
      }
      const update = promiseUpdate(promise);
      let sourceKey: string | null = null;
      if (!update?.source) {
        skips.push({
          kind: "promise-update",
          title: promise.title,
          reason: "No sourced status line, so no promise update was imported.",
        });
      } else {
        sourceKey = addSource({
          title: update.source.title,
          publisher: update.source.publisher,
          date: update.source.date,
          url: update.source.url,
        });
        if (!sourceKey) {
          skips.push({
            kind: "promise-update",
            title: promise.title,
            reason: "The status source was skipped.",
          });
        }
      }
      const partyId = partyIdFor(manifesto.party);
      if (!partyId) return;
      plannedPromises.push({
        externalId: `${manifesto.slug}:${promise.slug}`,
        manifesto: manifesto.slug,
        partyId,
        area: promise.measure,
        body,
        title: promise.title,
        sort: index + 1,
        status: promiseEnum(promise.status),
        detail: sourceKey ? (update?.detail ?? null) : null,
        sourceKey,
      });
    });
  }

  const financeSourceKeys = ["PL-F-01", "PL-F-03"]
    .map((id) => plannedEntries.find((entry) => entry.externalId === id)?.sourceKey)
    .filter((key): key is string => Boolean(key));
  const electionSourceKeys = plannedEntries
    .filter((entry) => entry.section === "elections")
    .flatMap((entry) => entry.sourceKeys)
    .filter((key) => sources.get(key)?.type === "ECI");

  return {
    reason: IMPORT_REASON,
    parties,
    constituencies,
    people,
    sources: [...sources.values()],
    entries: plannedEntries,
    cases: plannedCases,
    promises: plannedPromises,
    datasets: [
      {
        key: "finance",
        data: financeRows,
        sourceKeys: financeSourceKeys,
      },
      {
        key: "elections",
        data: {
          presentation: "separate-records",
          records: ["PL-E-01", "PL-E-02", "PL-E-03", "PL-E-05"],
        },
        sourceKeys: [...new Set(electionSourceKeys)],
      },
    ],
    skips,
  };
}
