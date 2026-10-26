import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RegisterMark } from "@/components/civic-icons";
import { LeaderFinder } from "@/components/leader-finder";
import { SourceKey } from "@/components/source-key";
import { getEntries, getLeaders } from "@/lib/data";
import { localizedText } from "@/lib/public/text";
import { sourceMark } from "@/data/source-mark";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "LeadersPage" });
  return { title: t("title"), description: t("description") };
}

export default async function LeadersPage() {
  const t = await getTranslations("LeadersPage");
  const locale = await getLocale();
  const leaders = await getLeaders();
  const entries = await getEntries();

  return (
    <>
      <header className="intro page-head">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("intro", { count: leaders.length })}</p>
          <p>
            <Link href="/constituencies">{t("constituencies")}</Link>
          </p>
        </div>
        <RegisterMark kind="leaders" />
      </header>
      <SourceKey />
      <LeaderFinder
        leaders={leaders.map((leader) => {
          const records = leader.recordIds
            .map((id) => entries.find((entry) => entry.id === id))
            .filter((entry) => entry !== undefined);
          const lines =
            records.length > 0
              ? records.map((entry) => ({
                  title: localizedText(locale, entry.title, entry.titleTe),
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
