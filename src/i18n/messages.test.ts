import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

function keys(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      keys(child, prefix ? `${prefix}.${key}` : key),
    );
  }

  return [prefix];
}

test("English and Telugu message files have the same keys", () => {
  const english = JSON.parse(readFileSync("messages/en.json", "utf8"));
  const telugu = JSON.parse(readFileSync("messages/te.json", "utf8"));

  expect(keys(telugu).sort()).toEqual(keys(english).sort());
});
