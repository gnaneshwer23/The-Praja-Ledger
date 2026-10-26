import { expect, test } from "vitest";
import {
  affidavitFileDecision,
  CALCULATED_BY,
  mergeStage,
  planAffidavitImport,
  type SeatRef,
} from "./affidavit";

const fileKey = "a".repeat(64);
const seats: SeatRef[] = [
  {
    id: "ac-kodangal",
    name: "Kodangal",
    memberName: "Anumula Revanth Reddy",
    leaderSlug: "revanth-reddy",
  },
];

const header = "constituency,name,party,assets,liabilities,declared_cases,serious_cases,source_url,page_number,year,election";

function row(values: string[]) {
  return values.join(",");
}

test("a row without a source url or a page is rejected and not stored", () => {
  const csv = [
    header,
    row(["Kodangal", "A. Example", "Congress", "10", "2", "1", "0", "", "4", "2023", "Assembly"]),
    row(["Kodangal", "A. Example", "Congress", "10", "2", "1", "0", "https://eci.gov.in/a.pdf", "", "2023", "Assembly"]),
  ].join("\n");
  const plan = planAffidavitImport(csv, seats, fileKey);
  expect(plan.rows).toEqual([]);
  expect(plan.changes).toEqual([]);
  expect(plan.rejected.map((item) => item.reason)).toEqual([
    "source url required",
    "page number required",
  ]);
});

test("personal-data keys are rejected and not stored", () => {
  const csv = [
    "constituency,name,phone,source_url,page_number,year,election",
    "Kodangal,A. Example,9000000000,https://eci.gov.in/a.pdf,4,2023,Assembly",
  ].join("\n");
  const plan = planAffidavitImport(csv, seats, fileKey);
  expect(plan.rows).toEqual([]);
  expect(plan.constituencies).toEqual([]);
  expect(plan.rejected).toEqual([{ line: 1, reason: "personal data" }]);
});

test("a second import of the same file does not add a row", () => {
  const line = row([
    "Kodangal",
    "A. Example",
    "Congress",
    "10",
    "2",
    "1",
    "0",
    "https://eci.gov.in/a.pdf",
    "4",
    "2023",
    "Assembly",
  ]);
  const csv = [header, line, line].join("\n");
  const first = planAffidavitImport(csv, seats, fileKey);
  const second = planAffidavitImport(csv, seats, fileKey);
  expect(first.rows).toHaveLength(1);
  expect(second.rows.map((item) => item.rowKey)).toEqual(first.rows.map((item) => item.rowKey));
  const stored = mergeStage(new Map(), first.rows);
  const again = mergeStage(stored.ids, second.rows);
  expect(stored.inserted).toHaveLength(1);
  expect(again.inserted).toEqual([]);
  expect(again.unchanged).toEqual(stored.inserted);
  expect(again.ids.size).toBe(1);
});

test("a reservation category is stored only on the constituency", () => {
  const csv = [
    `${header},reservation_category`,
    row([
      "Kodangal",
      "Anumula Revanth Reddy",
      "Congress",
      "10",
      "2",
      "1",
      "0",
      "https://eci.gov.in/a.pdf",
      "4",
      "2023",
      "Assembly",
      "SC",
    ]),
  ].join("\n");
  const plan = planAffidavitImport(csv, seats, fileKey);
  expect(plan.rejected).toEqual([]);
  expect(plan.constituencies).toEqual([
    { constituencyId: "ac-kodangal", reservationCategory: "SC" },
  ]);
  expect(plan.rows).toHaveLength(1);
  expect(plan.rows[0]).not.toHaveProperty("reservationCategory");
  expect(plan.rows[0]?.personSlug).toBe("revanth-reddy");
  expect(Object.keys(plan.rows[0] ?? {})).not.toEqual(
    expect.arrayContaining(["caste", "religion", "address", "phone"]),
  );
  expect("people" in plan).toBe(false);
});

test("a change is calculated only when the file has both affidavits", () => {
  const one = [
    `${header},change`,
    row([
      "Kodangal",
      "A. Example",
      "Congress",
      "10",
      "2",
      "1",
      "0",
      "https://eci.gov.in/a.pdf",
      "4",
      "2023",
      "Assembly",
      "100",
    ]),
  ].join("\n");
  const single = planAffidavitImport(one, seats, fileKey);
  expect(single.rows).toEqual([]);
  expect(single.changes).toEqual([]);
  expect(single.rejected.map((item) => item.reason)).toEqual(["single affidavit change"]);

  const pair = [
    header,
    row(["Kodangal", "A. Example", "Congress", "10", "2", "1", "0", "https://eci.gov.in/a.pdf", "4", "2023", "Assembly"]),
    row(["Kodangal", "A. Example", "Congress", "25", "2", "1", "0", "https://eci.gov.in/b.pdf", "6", "2024", "Assembly"]),
  ].join("\n");
  const planned = planAffidavitImport(pair, seats, fileKey);
  expect(planned.rows).toHaveLength(2);
  expect(planned.changes).toEqual([
    {
      constituencyId: "ac-kodangal",
      personKey: "aexample",
      earlierYear: 2023,
      laterYear: 2024,
      assetsDeltaInr: 15,
      liabilitiesDeltaInr: 0,
      declaredCasesDelta: 0,
      seriousCasesDelta: 0,
      label: CALCULATED_BY,
    },
  ]);
});

test("an ADR or MyNeta file is not an import", () => {
  expect(affidavitFileDecision("eci-affidavits.csv")).toBe("import");
  expect(affidavitFileDecision("adr-affidavits.csv")).toBe("adr");
  expect(affidavitFileDecision("myneta.csv")).toBe("adr");
  expect(affidavitFileDecision("results.csv")).toBe("skip");
});
