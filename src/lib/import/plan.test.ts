import { describe, expect, test } from "vitest";
import { entries } from "../../data/ledger";
import { buildPlan, publishedOn } from "./plan";

const plan = buildPlan();

describe("compiled edition import plan", () => {
  test("parses a full date and leaves incomplete dates empty", () => {
    expect(publishedOn("12 October 2026")).toBe("2026-10-12");
    expect(publishedOn("2 Sep 2026")).toBe("2026-09-02");
    expect(publishedOn("15 Dec 2025")).toBe("2025-12-15");
    expect(publishedOn("Read 25 October 2026")).toBeNull();
    expect(publishedOn("April 2026")).toBeNull();
    expect(publishedOn("2026")).toBeNull();
    expect(publishedOn("June 2024")).toBeNull();
  });

  test("imports the compiled leaders and does not pad to the missing register", () => {
    expect(plan.people).toHaveLength(11);
    expect(plan.people.map((person) => person.slug)).toContain("revanth-reddy");
    expect(plan.cases.length).toBeLessThan(9);
    expect(plan.promises.length).toBeLessThan(24);
    expect(plan.people.length).not.toBe(27);
  });

  test("leaves Kavitha's party empty and publishes no affidavit totals", () => {
    expect(plan.people.find((person) => person.slug === "k-kavitha")?.partyId).toBeNull();
    expect(plan.skips.some((skip) => skip.kind === "affidavit")).toBe(true);
    expect(JSON.stringify(plan)).not.toContain("assets_inr");
  });

  test("does not invent tier-1 court URLs", () => {
    expect(plan.sources.some((source) => source.type === "COURT")).toBe(false);
    expect(plan.sources.some((source) => source.type === "SPKR")).toBe(false);
    const kaleshwaram = plan.sources.find((source) =>
      source.url.includes("kaleshwaram-report"),
    );
    expect(kaleshwaram?.type).toBe("MEDIA");
    for (const title of [
      "Danam Nagender, 18 Sep 2026",
      "24 Sep 2026",
      "Akbaruddin Owaisi",
      "Kaleshwaram commission report",
    ]) {
      expect(plan.skips.some((skip) => skip.kind === "tier-1" && skip.title.includes(title))).toBe(
        true,
      );
    }
    expect(
      plan.sources.some(
        (source) =>
          ["COURT", "CAG", "ECI", "SPKR"].includes(source.type) && source.url.trim() === "",
      ),
    ).toBe(false);
  });

  test("keeps the Verify flag and skips unsourced change lines", () => {
    expect(plan.entries.find((entry) => entry.externalId === "PL-C-05")?.verify).toBe(true);
    expect(plan.entries.some((entry) => entry.externalId === "PL-H-01")).toBe(false);
    expect(plan.entries.some((entry) => entry.externalId === "PL-H-02")).toBe(false);
    expect(plan.entries).toHaveLength(entries.filter((entry) => entry.sources.length > 0).length);
  });

  test("does not publish a Cheyutha current amount or a manifesto quote", () => {
    const cheyutha = plan.promises.find((promise) => promise.externalId.endsWith("cheyutha-pension"));
    expect(cheyutha).toBeTruthy();
    expect(cheyutha?.detail?.toLowerCase()).toContain("does not state the monthly amount");
    expect(plan.promises).toHaveLength(14);
    expect(
      plan.promises.filter((promise) => promise.sourceKey === null).map((promise) => promise.externalId),
    ).toEqual([
      "congress-2023:yuva-vikasam-schools",
      "congress-2023:cheyutha-aarogyasri",
    ]);
    expect(cheyutha?.detail).not.toContain("Warangal");
    expect(cheyutha?.sourceKey).toContain("Socio-Economic-Outlook-2026");
    expect(plan.promises.every((promise) => promise.body.trim().toLowerCase() !== "not compiled yet")).toBe(
      true,
    );
    expect(JSON.stringify(plan.promises)).not.toContain("quotePage");
  });

  test("is stable when built twice", () => {
    expect(buildPlan()).toEqual(plan);
  });
});
