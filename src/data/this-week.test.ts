import { expect, test } from "vitest";
import { entries, leaders } from "./ledger";
import {
  formatRecordDate,
  reliableSourceDate,
  thisWeekOnTheRecord,
  undatedEntriesForEmptyParties,
} from "./this-week";

test("this week keeps one newest dated entry per party", () => {
  const week = thisWeekOnTheRecord(leaders, entries);

  expect(week.map((item) => item.party)).toEqual(["BRS", "INC", "others"]);
  expect(week.map((item) => item.entry.id)).toEqual(["PL-C-01", "PL-I-02", "PL-C-02"]);
  expect(week.map((item) => formatRecordDate(item.changedOn))).toEqual([
    "12 Oct 2026",
    "2 Sep 2026",
    "28 Feb 2026",
  ]);
  expect(week.map((item) => item.leaderSlug)).toEqual([
    "k-t-rama-rao",
    "revanth-reddy",
    "k-kavitha",
  ]);
});

test("a read stamp or a month without a day is not a change date", () => {
  expect(reliableSourceDate("Read 25 October 2026")).toBeNull();
  expect(reliableSourceDate("April 2026")).toBeNull();
  expect(reliableSourceDate("2026")).toBeNull();
  expect(reliableSourceDate("12 October 2026")?.toISOString()).toBe("2026-10-12T00:00:00.000Z");
});

test("parties with no full date are reported and not shown", () => {
  const missing = undatedEntriesForEmptyParties(leaders, entries);

  expect(missing.map((item) => `${item.party}:${item.entry.id}`)).toEqual([
    "BJP:PL-E-02",
    "AIMIM:PL-E-02",
    "AIMIM:PL-E-01",
    "BJP:PL-E-05",
  ]);
});
