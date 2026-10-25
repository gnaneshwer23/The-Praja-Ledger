import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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

  return (
    <>
      <header className="intro">
        <h1>{leader.name}</h1>
        <p className="title-te" lang="te">
          {leader.nameTe}
        </p>
        <p className="summary">
          {leader.party}. {leader.office}.
        </p>
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
      <RecordList entries={records} />
      <p className="table-note">
        <Link href="/leaders">All leaders</Link>
      </p>
    </>
  );
}
