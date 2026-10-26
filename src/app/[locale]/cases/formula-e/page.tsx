import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { RecordList } from "@/components/record-list";
import { ShareSheet } from "@/components/share-sheet";
import { SourceKey } from "@/components/source-key";
import { StageRail } from "@/components/stage-rail";
import { getEntries } from "@/lib/data";
import en from "../../../../../messages/en.json";
import te from "../../../../../messages/te.json";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  return { title: t("formulaTitle"), description: t("formulaDetail") };
}

export default async function FormulaEPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const records = await getTranslations("Records");
  const entries = await getEntries();
  const entry = entries.find((item) => item.id === "PL-C-01");
  if (!entry) notFound();

  return (
    <article>
      <header className="intro">
        <p className="kicker">{t("formulaStatus")}</p>
        <h1>{t("formulaTitle")}</h1>
        <p>{t("formulaWho")}</p>
        <StageRail current="chargesheet" note />
        <p className="hearing">{t("formulaHearing")}</p>
        <details className="read-line">
          <summary>{records("read")}</summary>
          <p>{t("formulaDetail")}</p>
        </details>
        <ShareSheet path="/cases/formula-e" english={en.Share} telugu={te.Share} />
      </header>
      <SourceKey />
      <RecordList entries={[entry]} />
    </article>
  );
}
