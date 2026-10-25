import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterMark } from "@/components/civic-icons";
import { LeaderFinder } from "@/components/leader-finder";
import { SourceKey } from "@/components/source-key";
import { entriesByIds, leaders } from "@/data/ledger";
import { sourceMark } from "@/data/source-mark";

export const metadata: Metadata = {
  title: "Leaders",
  description:
    "Leaders entered in Praja Ledger, with the office each one currently holds on the public record.",
};

export default async function LeadersPage() {
  const t = await getTranslations("LeadersPage");

  return (
    <>
      <header className="intro page-head">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("intro", { count: leaders.length })}</p>
        </div>
        <RegisterMark kind="leaders" />
      </header>
      <SourceKey />
      <LeaderFinder
        leaders={leaders.map((leader) => {
          const records = entriesByIds(leader.recordIds);
          const lines =
            records.length > 0
              ? records.map((entry) => ({
                  title: entry.title,
                  source: entry.sources[0]?.publisher ?? "",
                  mark: sourceMark(entry.sources[0]),
                }))
              : leader.sources.slice(0, 1).map((source) => ({
                  title: source.title,
                  source: source.publisher,
                  mark: sourceMark(source),
                }));
          return {
            slug: leader.slug,
            name: leader.name,
            nameTe: leader.nameTe,
            party: leader.party === "Not compiled yet" ? t("noLines") : leader.party,
            office: leader.office,
            lines,
          };
        })}
      />
    </>
  );
}
