import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FollowButton } from "@/components/follow-button";
import { RecordList } from "@/components/record-list";
import { SourceKey } from "@/components/source-key";
import { entriesByIds, getLeader, leaders } from "@/data/ledger";
import { promisesForLeader } from "@/data/manifestos";
import { profileBlockIds, recordsForBlock } from "@/data/profile";

export function generateStaticParams() {
  return leaders.map((leader) => ({ slug: leader.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const leader = getLeader(slug);
  if (!leader) return { title: "Not in the book" };
  return {
    title: leader.name,
    description: `${leader.name}, ${leader.office}. ${leader.party}.`,
  };
}

export default function LeaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<p className="empty">Opening the record.</p>}>
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
  const leader = getLeader(slug);
  if (!leader) notFound();
  const records = entriesByIds(leader.recordIds);
  const t = await getTranslations("Profile");
  const manifesto = await getTranslations("Manifestos");
  const linkedPromises = promisesForLeader(leader.slug);

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
      </header>
      <p>{t("intro")}</p>
      <SourceKey />
      {profileBlockIds.map((block) => {
        const blockRecords = recordsForBlock(records, block);
        const filled = blockRecords.length > 0 || block === "office";
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
