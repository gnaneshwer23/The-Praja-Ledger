import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CorrectionsPage" });
  return { title: t("title"), description: t("description") };
}

export default async function CorrectionsPage() {
  const t = await getTranslations("CorrectionsPage");

  return (
    <>
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <h2>{t("needsTitle")}</h2>
      <ul className="index">
        <li>
          <p>{t("needId")}</p>
        </li>
        <li>
          <p>{t("needSentence")}</p>
        </li>
        <li>
          <p>{t("needDocument")}</p>
        </li>
      </ul>
      <p className="empty">{t("rumour")}</p>
    </>
  );
}
