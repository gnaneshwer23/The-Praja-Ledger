import type { MetadataRoute } from "next";
import { httpsSiteOrigin, publicPathnames, sitemapEntries } from "@/lib/sitemap/paths";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = httpsSiteOrigin(process.env.SITE_URL);
  return sitemapEntries(origin, publicPathnames());
}
