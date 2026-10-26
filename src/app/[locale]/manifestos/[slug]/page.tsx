import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ShareSheet } from "@/components/share-sheet";
import { Scorecard } from "@/components/scorecard";
import {
  congressTermMonth,
  manifestos,
  promiseStatuses,
  scorecardAsOfLabel,
  showsScorecard,
  tallyOf,
  termLength,
} from "@/data/manifestos";
import { getManifesto } from "@/lib/data";
import en from "../../../../../messages/en.json";
import te from "../../../../../messages/te.json";

export function generateStaticParams() {
  return manifestos.map((manifesto) => ({ slug: manifesto.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const manifesto = await getManifesto(slug);
  const t = await getTranslations({ locale, namespace: "Manifestos" });
  if (!manifesto) return { title: t("missing") };
  return {
    title: manifesto.title,
    description: manifesto.title,
  };
}

export default async function ManifestoPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const manifesto = await getManifesto(slug);
  if (!manifesto) notFound();
  const t = await getTranslations("Manifestos");
  const visible = showsScorecard(manifesto);
  const tally = tallyOf(manifesto.promises);
  const countedStatuses = promiseStatuses.filter((status) => tally.counts[status] > 0);
  const counts = countedStatuses.map((status) => ({
    key: status,
    label: t(`statuses.${status}`),
    value: tally.counts[status],
  }));
  const monthNumber = manifesto.slug === "congress-2023" ? congressTermMonth : null;
  const monthLabel = monthNumber
    ? t("monthOfTerm", { n: monthNumber, total: termLength })
    : "";
  const englishCard = {
    cardKicker: en.Manifestos.cardKicker,
    cardTitle: manifesto.title,
    cardWho: en.Manifestos.cardWho.replace("{n}", String(monthNumber ?? "")),
    cardBody: `${countedStatuses.map((status) => `${en.Manifestos.statuses[status]} ${tally.counts[status]}`).join(". ")}. ${en.Manifestos.total} ${tally.total}.`,
    cardHearing: en.Manifestos.asOf.replace("{date}", scorecardAsOfLabel),
    cardSource: en.Manifestos.cardSource,
    cardTeluguLine: en.Manifestos.cardTeluguLine,
  };
  const teluguCard = {
    cardKicker: te.Manifestos.cardKicker,
    cardTitle: manifesto.title,
    cardWho: te.Manifestos.cardWho.replace("{n}", String(monthNumber ?? "")),
    cardBody: `${countedStatuses.map((status) => `${te.Manifestos.statuses[status]} ${tally.counts[status]}`).join(". ")}. ${te.Manifestos.total} ${tally.total}.`,
    cardHearing: te.Manifestos.asOf.replace("{date}", scorecardAsOfLabel),
    cardSource: te.Manifestos.cardSource,
    cardTeluguLine: te.Manifestos.cardTeluguLine,
  };

  return (
    <>
      <header className="intro page-head">
        <div>
          <p>
            <span className="chip">{manifesto.party}</span>
          </p>
          <h1>{manifesto.title}</h1>
          {manifesto.inGovernment ? (
            <>
              <p>{t("inGovernment")}</p>
              <p>{manifesto.government === "union" ? t("union") : t("state")}</p>
              {manifesto.swornInLabel ? (
                <p>{t("since", { date: manifesto.swornInLabel })}</p>
              ) : null}
            </>
          ) : (
            <p>{t("notInGovernment")}</p>
          )}
          {manifesto.listFrozen && manifesto.freezeDate ? (
            <p>{t("congressNote", { date: manifesto.freezeDate })}</p>
          ) : (
            <p>{t("pdfMissing")}</p>
          )}
        </div>
      </header>
      <Scorecard
        visible={visible && monthNumber !== null}
        monthLabel={monthLabel}
        asOfLabel={t("asOf", { date: scorecardAsOfLabel })}
        counts={counts}
        totalLabel={t("total")}
        total={tally.total}
      />
      {visible && monthNumber !== null ? <p className="quiet">{t("audit")}</p> : null}
      {visible && monthNumber !== null ? (
        <ShareSheet
          path={`/manifestos/${manifesto.slug}`}
          english={englishCard}
          telugu={teluguCard}
        />
      ) : null}
      {visible ? (
        <ol className="records">
          {manifesto.promises.map((promise) => (
            <li key={promise.slug} className="record">
              <h2>
                <Link href={`/manifestos/${manifesto.slug}/${promise.slug}`}>
                  {promise.title}
                </Link>
              </h2>
              <p className="status">{t(`statuses.${promise.status}`)}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty">{t("missing")}</p>
      )}
      <p className="table-note">
        <Link href="/manifestos">{t("back")}</Link>
      </p>
    </>
  );
}
