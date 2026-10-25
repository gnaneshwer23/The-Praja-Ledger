import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="site-footer">
      <div>
        <strong>Praja Ledger</strong>
        <p>{t("blurb")}</p>
      </div>
      <nav className="foot-links" aria-label="Praja Ledger">
        <Link href="/method">{t("method")}</Link>
        <Link href="/#rules">{t("rules")}</Link>
        <Link href="/corrections">{t("corrections")}</Link>
        <Link href="/method">{t("data")}</Link>
        <Link href="/changes">{t("changes")}</Link>
        <Link href="/privacy">{t("privacy")}</Link>
        <Link href="/finances">{t("finances")}</Link>
        <Link href="/elections">{t("elections")}</Link>
      </nav>
    </footer>
  );
}
