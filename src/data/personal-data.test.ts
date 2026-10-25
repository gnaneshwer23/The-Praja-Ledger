import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const forbidden = new Set([
  "health",
  "marriage",
  "spouse",
  "dependant",
  "dependent",
  "child",
  "children",
  "religion",
  "caste",
  "address",
  "phone",
  "aadhaar",
  "pan",
  "bank",
  "relationship",
  "father",
  "mother",
  "brother",
  "sister",
  "wife",
  "husband",
  "son",
  "daughter",
]);

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return filesUnder(full);
    return /\.(ts|tsx|json)$/.test(name) ? [full] : [];
  });
}

function objectKeys(source: string) {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/`(?:\\.|[^`])*`/g, "\"\"")
    .replace(/"(?:\\.|[^"\\])*"/g, "\"\"")
    .replace(/'(?:\\.|[^'\\])*'/g, "\"\"");
  return [...code.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\??\s*:/g)].map(
    (match) => match[1],
  );
}

test("data files do not use forbidden personal-data keys", () => {
  const hits = filesUnder("src/data").flatMap((file) =>
    objectKeys(readFileSync(file, "utf8"))
      .filter((key) => forbidden.has(key.toLowerCase()))
      .map((key) => `${file} key ${key}`),
  );

  expect(hits).toEqual([]);
});

test("reservationCategory is only a constituency field", () => {
  const hits = filesUnder("src/data")
    .filter((file) => !file.endsWith(`${path.sep}constituencies.ts`))
    .flatMap((file) =>
      objectKeys(readFileSync(file, "utf8"))
        .filter((key) => key === "reservationCategory")
        .map((key) => `${file} key ${key}`),
    );

  expect(hits).toEqual([]);
  const constituencyKeys = objectKeys(
    readFileSync("src/data/constituencies.ts", "utf8"),
  );
  expect(constituencyKeys).toContain("reservationCategory");
});
