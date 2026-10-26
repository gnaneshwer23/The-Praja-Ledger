import { expect, test } from "vitest";
import {
  caseEventFormSchema,
  entryFormSchema,
  hasBlockedWording,
  issueCodes,
  reviewSides,
} from "./editorial";

const personId = "55555555-5555-4555-8555-555555555555";
const sourceId = "66666666-6666-4666-8666-666666666666";

function entry(overrides: Record<string, string> = {}) {
  return entryFormSchema.safeParse({
    personId,
    kind: "issue",
    body: "A chargesheet was filed.",
    bodyTe: "",
    sourceMode: "new",
    sourceId: "",
    sourceType: "MEDIA",
    url: "https://example.com/report",
    title: "Report",
    publisher: "Paper",
    publishedOn: "2026-10-25",
    reason: "Adding a sourced line.",
    ...overrides,
  });
}

test("R5 blocks an empty reason before save", () => {
  const parsed = entry({ reason: "  " });
  expect(parsed.success).toBe(false);
  if (!parsed.success) expect(issueCodes(parsed.error)).toContain("reason");
});

test("R1 blocks a court source without a url", () => {
  const parsed = entry({ sourceType: "COURT", url: "" });
  expect(parsed.success).toBe(false);
  if (!parsed.success) expect(issueCodes(parsed.error)).toContain("tier1_url");
});

test("R2 blocks corrupt, scam, guilty, and criminal unless the source is a court record", () => {
  for (const word of ["corrupt", "scam", "guilty", "criminal"]) {
    const parsed = entry({ body: `The report uses the word ${word}.` });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(issueCodes(parsed.error)).toContain("wording");
  }
  const court = entry({
    sourceType: "COURT",
    url: "https://example.com/order",
    body: "The verdict used the word guilty.",
    reason: "Quoting the verdict.",
  });
  expect(court.success).toBe(true);
  expect(hasBlockedWording("corruption inquiry", "MEDIA")).toBe(false);
});

test("a case note is checked the same way", () => {
  const parsed = caseEventFormSchema.safeParse({
    caseId: personId,
    stageIdx: "1",
    eventDate: "2026-10-25",
    note: "The note calls the person guilty.",
    sourceId,
    sourceType: "MEDIA",
    reason: "Stage check.",
  });
  expect(parsed.success).toBe(false);
  if (!parsed.success) expect(issueCodes(parsed.error)).toContain("wording");
});

test("a review diff keeps both sides", () => {
  expect(reviewSides(null, "After")).toEqual({ before: null, after: "After" });
  expect(reviewSides("Before", "After")).toEqual({ before: "Before", after: "After" });
});
