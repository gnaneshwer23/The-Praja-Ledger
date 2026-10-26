import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { entries } from "../../data/ledger";
import { manifestos } from "../../data/manifestos";
import {
  gapRows,
  messageReviewRows,
  parseTranslatorCsv,
  recordGaps,
  worklistCsv,
} from "./translation";

test("a TODO-review file lists every message key and keeps the Telugu that is already there", () => {
  const english = { Admin: { title: "Editor console" }, _status: "ignored" };
  const telugu = { _status: "TODO-review", Admin: { title: "ఎడిటర్ కన్సోల్" } };
  const rows = messageReviewRows(english, telugu);
  expect(rows.map((row) => row.key)).toEqual(["Admin.title"]);
  expect(rows[0]?.telugu).toBe("ఎడిటర్ కన్సోల్");
  expect(rows[0]?.note).toBe("todo-review");
});

test("a reviewed message file adds no chrome rows", () => {
  expect(messageReviewRows({ Admin: { title: "Editor console" } }, { Admin: { title: "ఎడిటర్" } })).toEqual([]);
});

test("the real Telugu file is still marked for review and is not rewritten here", () => {
  const english = JSON.parse(readFileSync("messages/en.json", "utf8"));
  const telugu = JSON.parse(readFileSync("messages/te.json", "utf8"));
  const rows = messageReviewRows(english, telugu);
  const title = rows.find((row) => row.key === "Admin.title");
  expect(telugu._status).toBe("TODO-review");
  expect(title?.telugu).toBe("ఎడిటర్ కన్సోల్");
  expect(title?.english).toBe("Editor console");
});

test("missing record fields are listed with an empty Telugu cell", () => {
  const rows = recordGaps({
    people: [
      { slug: "kept", name: "Kept Person", nameTe: "ఉంది" },
      { slug: "open-person", name: "Open Person", nameTe: "  " },
    ],
    cases: [
      {
        slug: "PL-C-P8",
        title: "A court stage",
        summary: "The stage is chargesheet.",
        titleTe: null,
        summaryTe: null,
      },
    ],
    promises: [{ key: "congress-2023:sample", body: "A sourced promise line.", bodyTe: null }],
  });
  expect(rows.map((row) => `${row.kind}:${row.key}:${row.field}`)).toEqual([
    "person:open-person:name_te",
    "case:PL-C-P8:title_te",
    "case:PL-C-P8:summary_te",
    "promise:congress-2023:sample:body_te",
  ]);
  expect(rows.every((row) => row.telugu === "")).toBe(true);
  const csv = worklistCsv(rows);
  expect(csv.split("\n")[0]).toBe("kind,key,field,english,telugu,note");
  expect(csv).toContain("Open Person");
  expect(csv).not.toContain("Kept Person");
});

test("compiled cases and promises are gaps, and their Telugu cells stay empty", () => {
  const rows = recordGaps({
    people: [],
    cases: entries
      .filter((entry) => entry.section === "cases" && entry.id.startsWith("PL-C-"))
      .map((entry) => ({
        slug: entry.id,
        title: entry.title,
        summary: entry.body,
        titleTe: null,
        summaryTe: null,
      })),
    promises: manifestos.flatMap((manifesto) =>
      manifesto.promises.map((promise) => ({
        key: `${manifesto.slug}:${promise.slug}`,
        body: promise.title,
        bodyTe: null,
      })),
    ),
  });
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((row) => row.telugu === "" && row.note === "missing")).toBe(true);
  expect(rows.some((row) => row.kind === "case" && row.field === "title_te")).toBe(true);
  expect(rows.some((row) => row.kind === "promise" && row.field === "body_te")).toBe(true);
});

test("an editor gap view becomes the same empty Telugu list", () => {
  const rows = gapRows([
    { kind: "person", entity_key: "open-person", field: "name_te", english: "Open Person" },
    { kind: "case", entity_key: "PL-C-P8", field: "summary_te", english: "The stage is chargesheet." },
  ]);
  expect(rows.map((row) => row.field)).toEqual(["name_te", "summary_te"]);
  expect(rows.every((row) => row.telugu === "")).toBe(true);
});

test("a translator row with empty Telugu is rejected and nothing is staged", () => {
  const parsed = parseTranslatorCsv(
    "kind,key,field,telugu,reason\nperson,open-person,name_te,,Supply a name\n",
    "Stage the file",
  );
  expect(parsed.rows).toEqual([]);
  expect(parsed.rejections).toEqual([{ line: 2, code: "telugu" }]);
});

test("a translator file stages only filled rows and does not approve them", () => {
  const parsed = parseTranslatorCsv(
    [
      "kind,key,field,english,telugu,note",
      "person,open-person,name_te,Open Person,ఓపెన్,missing",
      "case,PL-C-P8,title_te,A court stage,,missing",
      "person,open-person,party,Open Person,వేరే పార్టీ,missing",
    ].join("\n"),
    "Stage the translator file",
  );
  expect(parsed.rows).toEqual([
    {
      kind: "person",
      key: "open-person",
      field: "name_te",
      telugu: "ఓపెన్",
      reason: "Stage the translator file",
    },
  ]);
  expect(parsed.rejections.map((item) => item.code)).toEqual(["telugu", "record"]);
});

test("blocked wording and a missing reason are rejected before a write", () => {
  const parsed = parseTranslatorCsv(
    "kind,key,field,telugu\nperson,open-person,name_te,called corrupt\nmessage,Admin.title,text,శీర్షిక\n",
    "  ",
  );
  expect(parsed.rows).toEqual([]);
  expect(parsed.rejections.map((item) => item.code)).toEqual(["wording", "reason"]);
});
