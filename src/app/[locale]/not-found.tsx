import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <header className="intro">
      <h1>{t("title")}</h1>
      <p>{t("body")}</p>
      <p>
        <Link href="/">{t("back")}</Link>
      </p>
    </header>
  );
}
