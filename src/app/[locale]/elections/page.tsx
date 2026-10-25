import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RecordList } from "@/components/record-list";
import { entriesBySection } from "@/data/ledger";

export const metadata: Metadata = {
  title: "Elections",
  description:
    "Telangana assembly results from 2023 and Lok Sabha results from 2024, from the Election Commission.",
};

export default async function ElectionsPage() {
  const t = await getTranslations("ElectionsPage");

  return (
    <>
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <RecordList entries={entriesBySection("elections")} />
    </>
  );
}
