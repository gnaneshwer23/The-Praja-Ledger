"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const items = [
  { href: "/community", key: "home" },
  { href: "/leaders", key: "leaders" },
  { href: "/ask", key: "ask" },
  { href: "/saved", key: "saved" },
  { href: "/me", key: "me" },
] as const;

export function AppNav() {
  const t = useTranslations("AppNav");
  const path = usePathname();

  return (
    <nav className="app-nav" aria-label={t("label")}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={path === item.href ? "page" : undefined}
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}
