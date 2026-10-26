import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CorrectionForm, CorrectionNotice } from "@/components/public-forms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CorrectionsPage" });
  return { title: t("title"), description: t("description") };
}

async function CorrectionResult({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const query = await searchParams;
  return <CorrectionNotice notice={query.notice} />;
}

export default async function CorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const t = await getTranslations("CorrectionsPage");
  const locale = await getLocale();

  return (
    <>
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <Suspense fallback={null}>
        <CorrectionResult searchParams={searchParams} />
      </Suspense>
      <h2>{t("formTitle")}</h2>
      <CorrectionForm locale={locale} idPrefix="correction" />
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
