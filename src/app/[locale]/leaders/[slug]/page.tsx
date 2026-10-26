import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AffidavitSummary } from "@/components/affidavit-summary";
import { FollowButton } from "@/components/follow-button";
import { RecordList } from "@/components/record-list";
import { SourceKey } from "@/components/source-key";
import { leaders } from "@/data/ledger";
import { promisesForLeader } from "@/data/manifestos";
import { profileBlockIds, recordsForBlock } from "@/data/profile";
import { getAffidavitChanges, getAffidavits, getEntriesByIds, getLeader, getManifesto } from "@/lib/data";

export function generateStaticParams() {
  return leaders.map((leader) => ({ slug: leader.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const leader = await getLeader(slug);
  const t = await getTranslations({ locale, namespace: "Chrome" });
  if (!leader) return { title: t("notInBook") };
  return {
    title: leader.name,
    description: `${leader.name}, ${leader.office}. ${leader.party}.`,
  };
}

export default async function LeaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getTranslations("Profile");
  return (
    <Suspense fallback={<p className="empty">{t("opening")}</p>}>
      <LeaderRecord params={params} />
    </Suspense>
  );
}

async function LeaderRecord({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const leader = await getLeader(slug);
  if (!leader) notFound();
  const records = await getEntriesByIds(leader.recordIds);
  const affidavits = (await getAffidavits()).filter((item) => item.personSlug === leader.slug);
  const changes = (await getAffidavitChanges()).filter((item) => item.personSlug === leader.slug);
  const assetAffidavits = affidavits.filter((item) => item.assetsInr != null || item.liabilitiesInr != null);
  const caseAffidavits = affidavits.filter((item) => item.declaredCases != null || item.seriousCases != null);
  const t = await getTranslations("Profile");
  const manifesto = await getTranslations("Manifestos");
  const congress = await getManifesto("congress-2023");
  const linkedPromises = promisesForLeader(leader.slug).map(
    (promise) => congress?.promises.find((item) => item.slug === promise.slug) ?? promise,
  );

  return (
    <>
      <header className="intro profile">
        <div className="profile-head">
          <div className="profile-id">
            <h1>{leader.name}</h1>
            <p className="title-te" lang="te">
              {leader.nameTe}
            </p>
            <p className="leader-office">{leader.office}</p>
            <p className="leader-party">
              <span className="chip">
                {leader.party === "Not compiled yet" ? t("missing") : leader.party}
              </span>
            </p>
            {leader.partyHistory ? <p>{leader.partyHistory}</p> : null}
          </div>
        </div>
        <div className="profile-actions">
          <FollowButton />
          <Link href="/ask" className="ghost">
            {t("ask")}
          </Link>
        </div>
        <p className="quiet">{t("followNote")}</p>
        <p className="quiet">{t("office")}</p>
        <p>{t("intro")}</p>
      </header>
      <SourceKey />
      {profileBlockIds.map((block) => {
        const blockRecords = recordsForBlock(records, block);
        const filled = blockRecords.length > 0
          || block === "office"
          || (block === "assets" && assetAffidavits.length > 0)
          || (block === "cases" && caseAffidavits.length > 0)
          || (block === "affidavitChange" && changes.length > 0);
        return (
          <section key={block} className="profile-block" id={block}>
            <h2>{t(`blocks.${block}`)}</h2>
            <p className="quiet">{t(`about.${block}`)}</p>
            {block === "office" ? (
              <>
                <p className="summary">{leader.summary}</p>
                {leader.sources.length > 0 ? (
                  <ul className="sources">
                    {leader.sources.map((source) => (
                      <li key={source.url}>
                        <a href={source.url} rel="noreferrer">
                          {source.title}
                        </a>
                        {`, ${source.publisher}, ${source.date}`}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
            {blockRecords.length > 0 ? (
              <RecordList entries={blockRecords} showFormulaStage={block === "cases"} />
            ) : null}
            {block === "assets" && assetAffidavits.length > 0 ? (
              <AffidavitSummary affidavits={assetAffidavits} changes={[]} part="assets" />
            ) : null}
            {block === "cases" && caseAffidavits.length > 0 ? (
              <AffidavitSummary affidavits={caseAffidavits} changes={[]} part="cases" />
            ) : null}
            {block === "affidavitChange" && changes.length > 0 ? (
              <AffidavitSummary affidavits={[]} changes={changes} part="change" />
            ) : null}
            {block === "minister" && linkedPromises.length > 0 ? (
              <>
                <h3>{manifesto("leaderHeading")}</h3>
                <p className="quiet">
                  {leader.slug === "bhatti-vikramarka-mallu"
                    ? manifesto("leaderBhatti")
                    : manifesto("leaderRevanth")}
                </p>
                <ul className="sources">
                  {linkedPromises.map((promise) => (
                    <li key={promise.slug}>
                      <Link href={`/manifestos/congress-2023/${promise.slug}`}>
                        {promise.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {block === "cases" && blockRecords.length > 0 ? (
              <p>{t("pendingCase")}</p>
            ) : null}
            {filled ? null : <p className="empty">{t("missing")}</p>}
          </section>
        );
      })}
      <p className="table-note">
        {t("changed")} · <Link href="/changes">{t("log")}</Link>
      </p>
      <p className="table-note">
        <Link href="/leaders">{t("all")}</Link>
      </p>
    </>
  );
}
