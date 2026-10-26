import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RecordList } from "@/components/record-list";
import { getEntriesBySection } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ChangesPage" });
  return { title: t("title"), description: t("description") };
}

export default async function ChangesPage() {
  const t = await getTranslations("ChangesPage");
  const records = await getEntriesBySection("changes");

  return (
    <>
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <RecordList entries={records} />
    </>
  );
}
