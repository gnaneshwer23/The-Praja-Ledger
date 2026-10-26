import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterMark } from "@/components/civic-icons";
import { RecordList } from "@/components/record-list";
import { SourceKey } from "@/components/source-key";
import { StageRail } from "@/components/stage-rail";
import { getEntriesBySection } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CasesPage" });
  return { title: t("title"), description: t("description") };
}

export default async function CasesPage() {
  const t = await getTranslations("CasesPage");
  const stages = await getTranslations("Stages");
  const cases = await getEntriesBySection("cases");

  return (
    <>
      <header className="intro page-head">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
        <RegisterMark kind="cases" />
      </header>
      <StageRail current="chargesheet" note />
      <p className="quiet stage-caption">{stages("formulaNow")}</p>
      <SourceKey />
      <RecordList entries={cases} />
    </>
  );
}
