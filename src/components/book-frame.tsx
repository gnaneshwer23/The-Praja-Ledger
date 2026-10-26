"use client";

import { useTranslations } from "next-intl";
import { checkedOn, folioFor, sections } from "@/data/ledger";
import { Link, usePathname } from "@/i18n/navigation";

const sectionKey = {
  "/": "overview",
  "/leaders": "leaders",
  "/cases": "cases",
  "/manifestos": "manifestos",
  "/finances": "finances",
  "/elections": "elections",
  "/changes": "changes",
  "/corrections": "corrections",
  "/method": "method",
} as const;

export function BookFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Book");
  const path = usePathname();
  const folio = folioFor(path);
  const isHome = path === "/";

  return (
    <div className="book">
      <a className="skip" href="#content">
        {t("skip")}
      </a>
      <div className="gutter" aria-hidden="true">
        <span className="folio">{folio}</span>
      </div>
      <div className="sheet">
        {isHome ? null : (
          <p className="running">
            <Link href="/">{t("brand")}</Link>
            <span lang="te">{t("wordmark")}</span>
          </p>
        )}
        <nav className="nav" aria-label={t("sections")}>
          {sections.map((section) => {
            const current =
              section.href === "/"
                ? path === "/"
                : section.href === "/leaders"
                  ? path.startsWith("/leaders")
                  : path.startsWith(section.href);
            const key = sectionKey[section.href];
            return (
              <Link
                key={section.href}
                href={section.href}
                aria-current={current ? "page" : undefined}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>
        <main id="content">{children}</main>
        <footer className="colophon">
          <p>{t("checked", { date: checkedOn })}</p>
          <p>{t("colophon")}</p>
        </footer>
      </div>
    </div>
  );
}
