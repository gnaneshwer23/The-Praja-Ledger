import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { formatCount, getSeat, seats, type ReservationCategory } from "@/data/constituencies";
import { getLeader } from "@/data/ledger";

export function generateStaticParams() {
  return seats.map((seat) => ({ id: seat.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const seat = getSeat(id);
  if (!seat) return { title: "Not in the book" };
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
  const { id } = await params;
  const seat = getSeat(id);
  if (!seat) notFound();
  const t = await getTranslations("SeatPage");
  const profile = await getTranslations("Profile");
  const leader = seat.leaderSlug ? getLeader(seat.leaderSlug) : undefined;
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
