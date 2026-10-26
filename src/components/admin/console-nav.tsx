import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { StaffRole } from "@/lib/auth/console";

export async function ConsoleNav({ role }: { role: StaffRole }) {
  const t = await getTranslations("Admin");
  const links: { href: string; label: string }[] = [{ href: "/admin", label: t("navDashboard") }];
  if (role !== "reviewer") {
    links.push(
      { href: "/admin/entries", label: t("navEntries") },
      { href: "/admin/cases", label: t("navCases") },
      { href: "/admin/promises", label: t("navPromises") },
    );
  }
  if (role !== "editor") {
    links.push(
      { href: "/admin/review", label: t("navReview") },
      { href: "/admin/corrections", label: t("navCorrections") },
      { href: "/admin/replies", label: t("navReplies") },
    );
  }
  links.push({ href: "/admin/retract", label: t("navRetract") });
  if (role === "admin") links.push({ href: "/admin/settings", label: t("navSettings") });

  return (
    <nav className="admin-nav" aria-label={t("navLabel")}>
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
