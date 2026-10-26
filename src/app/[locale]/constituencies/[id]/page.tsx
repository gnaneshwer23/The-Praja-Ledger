import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AffidavitSummary } from "@/components/affidavit-summary";
import { Link } from "@/i18n/navigation";
import { formatCount, seats, type ReservationCategory } from "@/data/constituencies";
import { getAffidavitChanges, getAffidavits, getEntriesByIds, getLeader, getSeat } from "@/lib/data";
import { localizedText } from "@/lib/public/text";

export function generateStaticParams() {
  return seats.map((seat) => ({ id: seat.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const seat = await getSeat(id);
  const missing = await getTranslations({ locale, namespace: "Chrome" });
  if (!seat) return { title: missing("notInBook") };
  return {
    title: seat.name,
    description: `${seat.name}. ${seat.memberName}, ${seat.party}.`,
  };
}

export default async function SeatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getTranslations("Profile");
  return (
    <Suspense fallback={<p className="empty">{profile("opening")}</p>}>
      <SeatRecord params={params} />
    </Suspense>
  );
}

async function SeatRecord({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const seat = await getSeat(id);
  if (!seat) notFound();
  const t = await getTranslations("SeatPage");
  const profile = await getTranslations("Profile");
  const leader = seat.leaderSlug ? await getLeader(seat.leaderSlug) : undefined;
  const records = leader ? await getEntriesByIds(leader.recordIds) : [];
  const affidavits = (await getAffidavits()).filter((item) => item.constituencyId === seat.id);
  const changes = (await getAffidavitChanges()).filter((item) => item.constituencyId === seat.id);
  const result = seat.sources[0];

  return (
    <>
      <header className="intro">
        <p className="quiet">{seat.kind === "AC" ? t("assembly") : t("lokSabha")}</p>
        <h1>{seat.name}</h1>
        <dl className="facts">
          <div>
            <dt>{t("number")}</dt>
            <dd>{seat.number}</dd>
          </div>
          <div>
            <dt>{t("reservation")}</dt>
            <dd>
              {seat.reservationCategory
                ? t(reservationKey(seat.reservationCategory))
                : profile("missing")}
            </dd>
          </div>
          <div>
            <dt>{t("member")}</dt>
            <dd>{seat.memberName}</dd>
          </div>
          <div>
            <dt>{t("party")}</dt>
            <dd>
              <span className="chip">{seat.party}</span>
            </dd>
          </div>
        </dl>
        <p>{seat.kind === "AC" ? t("acNote") : t("pcNote")}</p>
        {seat.votes != null ? (
          <p>
            <a href={result.url} rel="noreferrer">
              {t("votes")} {formatCount(seat.votes)}
              {seat.margin != null ? `. ${t("margin")} ${formatCount(seat.margin)}` : ""}
            </a>
            {`, ${result.publisher}, ${result.date}`}
          </p>
        ) : null}
        {seat.votes == null && seat.margin != null ? (
          <p>
            <a href={result.url} rel="noreferrer">
              {t("margin")} {formatCount(seat.margin)}
            </a>
            {`, ${result.publisher}, ${result.date}`}
          </p>
        ) : null}
        {leader ? (
          <p>
            <Link href={`/leaders/${leader.slug}`}>{t("dossier")}</Link>
          </p>
        ) : (
          <p className="empty">{t("noDossier")}</p>
        )}
      </header>
      <h2>{t("affidavit")}</h2>
      {affidavits.length === 0 ? <p className="empty">{profile("missing")}</p> : (
        <AffidavitSummary affidavits={affidavits} changes={[]} />
      )}
      <h2>{t("entries")}</h2>
      {records.length === 0 ? <p className="empty">{profile("missing")}</p> : (
        <ul className="sources">
          {records.map((entry) => (
            <li key={entry.id}>
              <Link href={`/leaders/${leader?.slug}#${entry.id}`}>
                {localizedText(locale, entry.title, entry.titleTe)}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h2>{t("affidavitChange")}</h2>
      {changes.length === 0 ? <p className="empty">{profile("missing")}</p> : (
        <AffidavitSummary affidavits={[]} changes={changes} part="change" />
      )}
      <h2>{t("sources")}</h2>
      <ul className="sources">
        {seat.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} rel="noreferrer">
              {source.title}
            </a>
            {`, ${source.publisher}, ${source.date}`}
          </li>
        ))}
      </ul>
      <p className="table-note">
        <Link href="/constituencies">{t("all")}</Link>
      </p>
    </>
  );
}

function reservationKey(category: ReservationCategory) {
  if (category === "SC") return "sc" as const;
  if (category === "ST") return "st" as const;
  return "general" as const;
}
