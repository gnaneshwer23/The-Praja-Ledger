import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterMark } from "@/components/civic-icons";
import { RecordList } from "@/components/record-list";
import { SourceKey } from "@/components/source-key";
import { StageRail } from "@/components/stage-rail";
import { entriesBySection } from "@/data/ledger";

export const metadata: Metadata = {
  title: "Legal cases",
  description:
    "Court proceedings entered in Praja Ledger, with the news report each status comes from.",
};

export default async function CasesPage() {
  const t = await getTranslations("CasesPage");
  const stages = await getTranslations("Stages");

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
      <RecordList entries={entriesBySection("cases")} />
    </>
  );
}
