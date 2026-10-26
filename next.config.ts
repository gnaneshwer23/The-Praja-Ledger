import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["pg"],
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
