import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FollowButton } from "@/components/follow-button";
import { LeaderPortrait } from "@/components/leader-portrait";
import { RecordList } from "@/components/record-list";
import { SourceKey } from "@/components/source-key";
import { entriesByIds, getLeader, leaders } from "@/data/ledger";

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

  return (
    <>
      <header className="intro profile">
        <div className="profile-head">
          <LeaderPortrait name={leader.name} photo={leader.photo} />
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
            {leader.photoSourceUrl ? (
              <p className="quiet">
                <a href={leader.photoSourceUrl} rel="noreferrer">
                  {t("portrait")}
                </a>
              </p>
            ) : null}
          </div>
        </div>
        <div className="profile-actions">
          <FollowButton />
          <Link href="/ask" className="ghost">
            {t("ask")}
          </Link>
        </div>
        <p className="quiet">{t("followNote")}</p>
        <dl className="facts">
          <div>
            <dt>{t("assets")}</dt>
            <dd>
              {leader.affidavit
                ? `${leader.affidavit.assets} (${leader.affidavit.year})`
                : t("missing")}
            </dd>
          </div>
          <div>
            <dt>{t("pending")}</dt>
            <dd>
              {leader.affidavit
                ? `${leader.affidavit.cases} (${leader.affidavit.year})`
                : t("missing")}
            </dd>
          </div>
        </dl>
        <p className="quiet">{t("disclaimer")}</p>
        <p className="quiet">{t("office")}</p>
        <details className="read-line">
          <summary>{t("read")}</summary>
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
        </details>
      </header>
      <h2>{t("work")}</h2>
      <SourceKey />
      <RecordList entries={records} showFormulaStage />
      <p className="table-note">
        {t("changed")} · <Link href="/changes">{t("log")}</Link>
      </p>
      <p className="table-note">
        <Link href="/leaders">{t("all")}</Link>
      </p>
    </>
  );
}
