import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LedgerTable } from "@/components/ledger-table";
import { RecordList } from "@/components/record-list";
import { getEntriesByIds, getEntriesBySection, getFinance } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FinancesPage" });
  return { title: t("title"), description: t("description") };
}

export default async function FinancesPage() {
  const t = await getTranslations("FinancesPage");
  const finance = await getFinance();
  const budgetSource = (await getEntriesByIds(["PL-F-01"]))[0]?.sources ?? [];
  const debtSource = (await getEntriesByIds(["PL-F-03"]))[0]?.sources ?? [];
  const records = await getEntriesBySection("finances");

  return (
    <>
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <LedgerTable
        caption={t("budgetCaption", { unit: finance.budget.unit })}
        headers={finance.budget.headers}
        rows={finance.budget.rows}
        note={t("budgetNote")}
        sources={budgetSource}
      />
      <LedgerTable
        caption={t("debtCaption", { date: finance.publicDebt.asOn, unit: finance.publicDebt.unit })}
        headers={[t("debtHead"), t("debtAmount")]}
        rows={finance.publicDebt.rows}
        note={t("debtNote")}
        sources={debtSource}
      />
      <RecordList entries={records} />
    </>
  );
}
