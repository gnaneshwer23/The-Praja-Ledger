/**
 * Writes the Telugu review list to stdout.
 * Message keys stay listed while te.json is marked TODO-review.
 * Record rows are people, cases, and promises that have no Telugu field in this edition.
 * The Telugu cell for a record stays empty. This script does not invent a translation.
 */
import { readFileSync } from "node:fs";
import { entries } from "../src/data/ledger";
import { manifestos } from "../src/data/manifestos";
import { messageReviewRows, recordGaps, worklistCsv } from "../src/lib/import/translation";

const english = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf8"));
const telugu = JSON.parse(readFileSync(new URL("../messages/te.json", import.meta.url), "utf8"));

const rows = [
  ...messageReviewRows(english, telugu),
  ...recordGaps({
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
        body: promise.achieved?.trim()
          || promise.context?.trim()
          || promise.history.find((event) => event.detail.trim())?.detail.trim()
          || `${promise.measure}. ${promise.target}`,
        bodyTe: null,
      })),
    ),
  }),
];

process.stdout.write(worklistCsv(rows));
