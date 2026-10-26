import { expect, test } from "vitest";
import { correctionFormSchema, publicIssueCodes, replyFormSchema } from "./public-form";

test("a correction needs a record and keeps an optional email private to the form", () => {
  const parsed = correctionFormSchema.safeParse({
    entityType: "entry",
    publicId: "PL-C-01",
    body: "The hearing date does not match the report.",
    sourceUrl: "https://example.com/report",
    contactEmail: "reader@example.com",
  });
  expect(parsed.success).toBe(true);

  const empty = correctionFormSchema.safeParse({
    entityType: "entry",
    publicId: "",
    body: "",
    sourceUrl: "http://example.com/report",
    contactEmail: "not-an-email",
  });
  expect(empty.success).toBe(false);
  if (!empty.success) {
    expect(publicIssueCodes(empty.error)).toEqual(expect.arrayContaining(["record", "body", "url", "email"]));
  }
});

test("a reply cannot carry an address or a phone number", () => {
  const parsed = replyFormSchema.safeParse({
    publicId: "PL-C-01",
    officeName: "Office of the member",
    body: "The date in the line is 12 October 2026.",
    officeEmail: "",
  });
  expect(parsed.success).toBe(true);

  const personal = replyFormSchema.safeParse({
    publicId: "PL-C-01",
    officeName: "Office",
    body: "Write to office@example.com",
    officeEmail: "",
  });
  expect(personal.success).toBe(false);
  if (!personal.success) expect(publicIssueCodes(personal.error)).toContain("personal");
});
