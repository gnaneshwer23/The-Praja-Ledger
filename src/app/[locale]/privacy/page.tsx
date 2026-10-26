import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  return { title: t("title") };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");

  return (
    <article>
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("holdNote")}</p>
      </header>
      <ul className="hold-board">
        <li><strong>{t("holdAddress")}</strong></li>
        <li><strong>{t("holdPhone")}</strong></li>
        <li><strong>{t("holdIdentity")}</strong></li>
        <li><strong>{t("holdFamily")}</strong></li>
      </ul>
      <p className="panel">{t("accounts")}</p>
    </article>
  );
}
