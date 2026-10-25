import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Scorecard } from "../components/scorecard";
import {
  congressTermMonth,
  getManifesto,
  manifestos,
  promiseStatuses,
  promisesForLeader,
  showsScorecard,
  tallyOf,
  termMonth,
} from "./manifestos";

const roots = ["messages", "src", "prototype", "docs", "e2e"];
const banned = "Oper" + "ating";

function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return filesIn(full);
    return [full];
  });
}

test("a retired status word is absent from messages, source, prototype, docs, and e2e", () => {
  const hits = roots.flatMap((root) =>
    filesIn(root).filter((file) => {
      if (!/\.(tsx?|json|md|css)$/.test(file)) return false;
      return readFileSync(file, "utf8").toLowerCase().includes(banned.toLowerCase());
    }),
  );
  expect(hits).toEqual([]);
});

test("the Congress tally equals the count of current statuses", () => {
  const congress = getManifesto("congress-2023");
  expect(congress).toBeDefined();
  if (!congress) return;
  const tally = tallyOf(congress.promises);
  const sum = promiseStatuses.reduce((total, status) => total + tally.counts[status], 0);
  expect(sum).toBe(tally.total);
  expect(tally.total).toBe(congress.promises.length);
  expect(tally.counts).toEqual({
    delivered: 0,
    partial: 3,
    progress: 1,
    notStarted: 0,
    dropped: 0,
    unverified: 10,
  });
});

test("a manifesto that is not in government does not show a tally", () => {
  const hidden = manifestos.filter((manifesto) => !manifesto.inGovernment);
  expect(hidden.map((manifesto) => manifesto.slug).sort()).toEqual(["bjp-2023", "brs-2023"]);
  for (const manifesto of hidden) {
    expect(showsScorecard(manifesto)).toBe(false);
    const html = renderToStaticMarkup(
      createElement(Scorecard, {
        visible: showsScorecard(manifesto),
        monthLabel: "Month 35 of 60",
        asOfLabel: "As of 25 Oct 2026",
        counts: [],
        totalLabel: "Total",
        total: 0,
      }),
    );
    expect(html).toBe("");
    expect(html.includes("scorecard")).toBe(false);
  }
});

test("an unfrozen in-government manifesto does not show a tally", () => {
  for (const slug of ["brs-2014", "brs-2018", "bjp-union"]) {
    const manifesto = getManifesto(slug);
    expect(manifesto?.inGovernment).toBe(true);
    expect(manifesto?.listFrozen).toBe(false);
    expect(showsScorecard(manifesto!)).toBe(false);
  }
});

test("Congress month 35 is counted from 7 Dec 2023 to 25 Oct 2026", () => {
  expect(
    termMonth({ year: 2023, month: 12, day: 7 }, { year: 2026, month: 10, day: 25 }),
  ).toBe(35);
  expect(congressTermMonth).toBe(35);
  expect(termMonth({ year: 2023, month: 12, day: 7 }, { year: 2023, month: 12, day: 7 })).toBe(1);
  expect(termMonth({ year: 2023, month: 12, day: 7 }, { year: 2024, month: 1, day: 6 })).toBe(1);
  expect(termMonth({ year: 2023, month: 12, day: 7 }, { year: 2024, month: 1, day: 7 })).toBe(2);
});

test("Congress quotes are not compiled, and the leader page does not carry the tally", () => {
  const congress = getManifesto("congress-2023");
  expect(congress?.promises.every((promise) => promise.quote === null && promise.quotePage === null)).toBe(
    true,
  );
  expect(promisesForLeader("k-chandrashekar-rao")).toEqual([]);
  expect(promisesForLeader("t-harish-rao")).toEqual([]);
  const leaderPage = readFileSync("src/app/[locale]/leaders/[slug]/page.tsx", "utf8");
  expect(leaderPage.includes("Scorecard")).toBe(false);
  expect(leaderPage.includes('data-testid="scorecard"')).toBe(false);
});
