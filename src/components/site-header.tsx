"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const links = [
  { href: "/leaders", key: "leaders" },
  { href: "/cases", key: "cases" },
  { href: "/manifestos", key: "promises" },
  { href: "/ask", key: "ask" },
  { href: "/method", key: "method" },
  { href: "/chat", key: "chat" },
] as const;

export function SiteHeader({ locale }: { locale: string }) {
  const t = useTranslations("Nav");
  const path = usePathname();
  const nextLocale = locale === "te" ? "en" : "te";

  return (
    <header className="site-header">
      <nav className="campaign-nav" aria-label={t("menu")}>
        <Link href="/" className="campaign-brand">
          <span className="campaign-mark" aria-hidden="true" />
          {t("home")}
        </Link>
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={item.key === "chat" ? "nav-chat" : undefined}
            aria-current={path.startsWith(item.href) ? "page" : undefined}
          >
            {t(item.key)}
          </Link>
        ))}
        <Link href="/" locale={nextLocale} className="campaign-lang" hrefLang={nextLocale}>
          {t("language")}
        </Link>
        <Link href="/leaders" className="campaign-cta">
          {t("find")}
        </Link>
      </nav>
    </header>
  );
}
