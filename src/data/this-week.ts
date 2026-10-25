import type { Entry, Leader } from "./ledger";

export const partyBuckets = ["INC", "BRS", "BJP", "AIMIM", "others"] as const;

export type PartyBucket = (typeof partyBuckets)[number];

const months: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const monthAbbrev = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Congress, BRS, BJP and AIMIM keep their own rows. Every other label, including "None recorded", is others. */
export function partyBucket(party: string): PartyBucket {
  if (party === "Congress") return "INC";
  if (party === "BRS") return "BRS";
  if (party === "BJP") return "BJP";
  if (party === "AIMIM") return "AIMIM";
  return "others";
}

/**
 * A change date is a day, month and year printed on a source.
 * A read stamp, a year, or a month without a day is not a date we can rank.
 */
export function reliableSourceDate(date: string): Date | null {
  const text = date.trim();
  if (/^read\b/i.test(text)) return null;
  const match = text.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = months[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (month === undefined) return null;
  const value = new Date(Date.UTC(year, month, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month ||
    value.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
}

export function formatRecordDate(date: Date): string {
  return `${date.getUTCDate()} ${monthAbbrev[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function entryChangeDate(entry: Entry): Date | null {
  let latest: Date | null = null;
  for (const source of entry.sources) {
    const parsed = reliableSourceDate(source.date);
    if (!parsed) continue;
    if (!latest || parsed.getTime() > latest.getTime()) latest = parsed;
  }
  return latest;
}

export type WeekItem = {
  party: PartyBucket;
  entry: Entry;
  changedOn: Date;
  leaderSlug: string;
};

export type UndatedPartyEntry = {
  party: PartyBucket;
  entry: Entry;
};

/**
 * One entry per party: the linked record whose newest full source date is latest.
 * Entries with no full date are left out. Ties keep the earlier entry id, and the
 * first leader in the list who carries that entry.
 */
export function thisWeekOnTheRecord(leaderList: Leader[], entryList: Entry[]): WeekItem[] {
  const chosen = new Map<PartyBucket, WeekItem>();

  for (const leader of leaderList) {
    const party = partyBucket(leader.party);
    for (const id of leader.recordIds) {
      const entry = entryList.find((item) => item.id === id);
      if (!entry) continue;
      const changedOn = entryChangeDate(entry);
      if (!changedOn) continue;
      const current = chosen.get(party);
      const newer = !current || changedOn.getTime() > current.changedOn.getTime();
      const sameDayEarlierId =
        current &&
        changedOn.getTime() === current.changedOn.getTime() &&
        entry.id < current.entry.id;
      if (newer || sameDayEarlierId) {
        chosen.set(party, { party, entry, changedOn, leaderSlug: leader.slug });
      }
    }
  }

  return [...chosen.values()].sort((a, b) => {
    const byDate = b.changedOn.getTime() - a.changedOn.getTime();
    if (byDate !== 0) return byDate;
    return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0;
  });
}

/** Entries a party would have used, but every linked record lacks a full date. */
export function undatedEntriesForEmptyParties(
  leaderList: Leader[],
  entryList: Entry[],
): UndatedPartyEntry[] {
  const shown = new Set(thisWeekOnTheRecord(leaderList, entryList).map((item) => item.party));
  const seen = new Set<string>();
  const missing: UndatedPartyEntry[] = [];

  for (const leader of leaderList) {
    const party = partyBucket(leader.party);
    if (shown.has(party)) continue;
    for (const id of leader.recordIds) {
      const entry = entryList.find((item) => item.id === id);
      if (!entry || entryChangeDate(entry)) continue;
      const key = `${party}:${entry.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      missing.push({ party, entry });
    }
  }

  return missing;
}
