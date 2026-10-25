import type { Entry } from "./ledger";

export const profileBlockIds = [
  "office",
  "education",
  "income",
  "assets",
  "affidavitChange",
  "estimates",
  "cases",
  "legislature",
  "constituency",
  "minister",
  "business",
  "conduct",
] as const;

export type ProfileBlockId = (typeof profileBlockIds)[number];

const recordBlock: Record<string, ProfileBlockId> = {
  "PL-E-01": "office",
  "PL-E-02": "office",
  "PL-E-03": "office",
  "PL-E-05": "office",
  "PL-C-01": "cases",
  "PL-C-02": "cases",
  "PL-C-03": "cases",
  "PL-C-04": "cases",
  "PL-C-05": "cases",
  "PL-P-01": "minister",
  "PL-P-02": "minister",
  "PL-P-07": "minister",
  "PL-F-01": "minister",
  "PL-F-02": "minister",
  "PL-F-04": "minister",
  "PL-I-01": "conduct",
  "PL-I-02": "minister",
  "PL-I-03": "minister",
};

export function recordsForBlock(records: Entry[], block: ProfileBlockId) {
  return records.filter((entry) => recordBlock[entry.id] === block);
}

export function blockForRecord(id: string) {
  return recordBlock[id];
}
