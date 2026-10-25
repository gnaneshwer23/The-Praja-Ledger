"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const links = [
  { href: "/leaders", key: "leaders" },
  { href: "/cases", key: "cases" },
  { href: "/promises", key: "promises" },
  { href: "/ask", key: "ask" },
  { href: "/method", key: "method" },
] as const;

export function SiteHeader({ locale }: { locale: string }) {
  const t = useTranslations("Nav");
  const path = usePathname();
  const nextLocale = locale === "te" ? "en" : "te";

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <strong>{t("home")}</strong>
        <span lang="te">{t("wordmark")}</span>
      </Link>
      <nav className="site-nav" aria-label={t("menu")}>
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={path.startsWith(item.href) ? "page" : undefined}
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link href="/" locale={nextLocale} className="lang-link" hrefLang={nextLocale}>
          {t("language")}
        </Link>
        <Link href="/leaders" className="find-link">
          {t("find")}
        </Link>
      </div>
    </header>
  );
}
