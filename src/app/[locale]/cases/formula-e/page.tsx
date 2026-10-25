import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { RecordList } from "@/components/record-list";
import { ShareSheet } from "@/components/share-sheet";
import { StageRail } from "@/components/stage-rail";
import { entries } from "@/data/ledger";
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
  const entry = entries.find((item) => item.id === "PL-C-01");
  if (!entry) notFound();

  return (
    <article>
      <header className="intro">
        <p className="kicker">{t("formulaStatus")}</p>
        <h1>{t("formulaTitle")}</h1>
        <p>{t("formulaWho")}</p>
        <StageRail current="chargesheet" />
        <p>{t("formulaDetail")}</p>
        <p className="hearing">{t("formulaHearing")}</p>
        <ShareSheet path="/cases/formula-e" english={en.Share} telugu={te.Share} />
      </header>
      <RecordList entries={[entry]} />
    </article>
  );
}
