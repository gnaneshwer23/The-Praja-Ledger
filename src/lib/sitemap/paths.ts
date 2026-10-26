import { seats } from "../../data/constituencies";
import { leaders } from "../../data/ledger";
import { manifestos } from "../../data/manifestos";

const pages = [
  "",
  "/leaders",
  "/cases",
  "/cases/formula-e",
  "/constituencies",
  "/manifestos",
  "/ask",
  "/ask/example",
  "/method",
  "/data",
  "/changes",
  "/elections",
  "/finances",
  "/corrections",
  "/privacy",
  "/community",
  "/me",
  "/saved",
];

export function httpsSiteOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed.startsWith("https://")) return null;
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return null;
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function publicPathnames(): string[] {
  const paths = new Set<string>();
  for (const locale of ["en", "te"]) {
    for (const page of pages) paths.add(`/${locale}${page}`);
    for (const leader of leaders) paths.add(`/${locale}/leaders/${leader.slug}`);
    for (const seat of seats) paths.add(`/${locale}/constituencies/${seat.id}`);
    for (const manifesto of manifestos) {
      paths.add(`/${locale}/manifestos/${manifesto.slug}`);
      for (const promise of manifesto.promises) {
        paths.add(`/${locale}/manifestos/${manifesto.slug}/${promise.slug}`);
      }
    }
  }
  return [...paths].sort();
}

export function sitemapEntries(origin: string | null, paths: readonly string[]) {
  if (!origin) return [];
  return paths
    .filter((path) => path.startsWith("/en/") || path.startsWith("/te/") || path === "/en" || path === "/te")
    .filter((path) => !path.includes("/admin"))
    .map((path) => ({ url: `${origin}${path}` }));
}
