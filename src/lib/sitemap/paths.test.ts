import { expect, test } from "vitest";
import { httpsSiteOrigin, publicPathnames, sitemapEntries } from "./paths";

test("public paths cover both languages and leave the console out", () => {
  const paths = publicPathnames();
  expect(paths).toContain("/en");
  expect(paths).toContain("/te");
  expect(paths).toContain("/en/leaders/revanth-reddy");
  expect(paths).toContain("/te/constituencies/ac-kodangal");
  expect(paths.some((path) => path.includes("/admin"))).toBe(false);
});

test("the sitemap has no host until an https origin is set", () => {
  const paths = ["/en", "/te/leaders/revanth-reddy"];
  expect(sitemapEntries(null, paths)).toEqual([]);
  expect(httpsSiteOrigin("postgresql://owner:secret@db.example/praja")).toBeNull();
  expect(httpsSiteOrigin("http://localhost:3010")).toBeNull();
  expect(sitemapEntries("https://ledger.example", paths)).toEqual([
    { url: "https://ledger.example/en" },
    { url: "https://ledger.example/te/leaders/revanth-reddy" },
  ]);
});
