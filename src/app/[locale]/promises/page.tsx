import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterMark } from "@/components/civic-icons";
import { RecordList } from "@/components/record-list";
import { SourceKey } from "@/components/source-key";
import { entriesBySection } from "@/data/ledger";

export const metadata: Metadata = {
  title: "Promises",
  description:
    "The six Telangana guarantees, counted from the Socio-Economic Outlook 2026 and the 2026–27 budget analysis.",
};

export default async function PromisesPage() {
  const t = await getTranslations("PromisesPage");

  return (
    <>
      <header className="intro page-head">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
        <RegisterMark kind="promises" />
      </header>
      <SourceKey />
      <RecordList entries={entriesBySection("promises")} />
    </>
  );
}
