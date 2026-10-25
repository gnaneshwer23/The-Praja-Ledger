import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FollowButton } from "@/components/follow-button";
import { RecordList } from "@/components/record-list";
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
      <header className="intro">
        <h1>{leader.name}</h1>
        <p className="title-te" lang="te">
          {leader.nameTe}
        </p>
        <p className="summary">
          <span className="chip">{leader.party}</span> {leader.office}
        </p>
        <p className="quiet">{t("office")}</p>
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
            <dd>{t("missing")}</dd>
          </div>
          <div>
            <dt>{t("pending")}</dt>
            <dd>{t("missing")}</dd>
          </div>
        </dl>
        <p>{t("disclaimer")}</p>
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
      </header>
      <h2>{t("work")}</h2>
      <RecordList entries={records} />
      <p className="table-note">
        {t("changed")} · <Link href="/changes">{t("log")}</Link>
      </p>
      <p className="table-note">
        <Link href="/leaders">All leaders</Link>
      </p>
    </>
  );
}
