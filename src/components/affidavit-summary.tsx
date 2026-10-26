import { getTranslations } from "next-intl/server";
import type { PublishedAffidavit, PublishedAffidavitChange } from "@/lib/data/map";

function rupees(value: number) {
  return `₹${new Intl.NumberFormat("en-IN").format(value)}`;
}

export async function AffidavitSummary({
  affidavits,
  changes,
  part = "all",
}: {
  affidavits: PublishedAffidavit[];
  changes: PublishedAffidavitChange[];
  part?: "all" | "assets" | "cases" | "change";
}) {
  const t = await getTranslations("SeatPage");
  const profile = await getTranslations("Profile");
  const ordered = [...affidavits].sort((a, b) => a.year - b.year || a.pageNumber - b.pageNumber);
  const showAssets = part === "all" || part === "assets";
  const showCases = part === "all" || part === "cases";
  const showChanges = part === "all" || part === "change";

  return (
    <>
      {ordered.map((item) => (
        <article key={`${item.constituencyId}-${item.year}-${item.pageNumber}-${item.sourceUrl}`}>
          <p>
            {t("election")} {item.election}, {item.year}
          </p>
          <dl className="facts">
            {showAssets ? (
              <>
                <div>
                  <dt>{t("assets")}</dt>
                  <dd>{item.assetsInr == null ? profile("missing") : rupees(item.assetsInr)}</dd>
                </div>
                <div>
                  <dt>{t("liabilities")}</dt>
                  <dd>{item.liabilitiesInr == null ? profile("missing") : rupees(item.liabilitiesInr)}</dd>
                </div>
              </>
            ) : null}
            {showCases ? (
              <>
                <div>
                  <dt>{t("declaredCases")}</dt>
                  <dd>{item.declaredCases == null ? profile("missing") : item.declaredCases}</dd>
                </div>
                <div>
                  <dt>{t("seriousCases")}</dt>
                  <dd>{item.seriousCases == null ? profile("missing") : item.seriousCases}</dd>
                </div>
              </>
            ) : null}
            <div>
              <dt>{t("pdfPage")}</dt>
              <dd>{item.pageNumber}</dd>
            </div>
          </dl>
          {showAssets && (item.assetsInr != null || item.liabilitiesInr != null) ? <p className="quiet">{t("rupeesNote")}</p> : null}
          {showCases && (item.declaredCases != null || item.seriousCases != null) ? <p>{profile("disclaimer")}</p> : null}
          <ul className="sources">
            <li>
              <a href={item.sourceUrl} rel="noreferrer">
                {item.sourceTitle || item.sourceUrl}
              </a>
              {item.publisher ? `, ${item.publisher}` : ""}
              {item.publishedOn ? `, ${item.publishedOn}` : ""}
            </li>
          </ul>
        </article>
      ))}
      {showChanges ? changes.map((change) => (
        <article key={`${change.earlierAffidavitId}-${change.laterAffidavitId}`}>
          {change.assetsEarlierInr != null && change.assetsLaterInr != null && change.assetsDeltaInr != null ? (
            <p>
              {change.laterYear} {t("assets")} {rupees(change.assetsLaterInr)}
              {" − "}
              {change.earlierYear} {t("assets")} {rupees(change.assetsEarlierInr)}
              {" = "}
              {rupees(change.assetsDeltaInr)}
            </p>
          ) : null}
          {change.liabilitiesEarlierInr != null && change.liabilitiesLaterInr != null && change.liabilitiesDeltaInr != null ? (
            <p>
              {change.laterYear} {t("liabilities")} {rupees(change.liabilitiesLaterInr)}
              {" − "}
              {change.earlierYear} {t("liabilities")} {rupees(change.liabilitiesEarlierInr)}
              {" = "}
              {rupees(change.liabilitiesDeltaInr)}
            </p>
          ) : null}
          {change.declaredCasesEarlier != null && change.declaredCasesLater != null && change.declaredCasesDelta != null ? (
            <p>
              {change.laterYear} {t("declaredCases")} {change.declaredCasesLater}
              {" − "}
              {change.earlierYear} {t("declaredCases")} {change.declaredCasesEarlier}
              {" = "}
              {change.declaredCasesDelta}
            </p>
          ) : null}
          {change.seriousCasesEarlier != null && change.seriousCasesLater != null && change.seriousCasesDelta != null ? (
            <p>
              {change.laterYear} {t("seriousCases")} {change.seriousCasesLater}
              {" − "}
              {change.earlierYear} {t("seriousCases")} {change.seriousCasesEarlier}
              {" = "}
              {change.seriousCasesDelta}
            </p>
          ) : null}
          <p>{t("calculatedBy")}</p>
        </article>
      )) : null}
    </>
  );
}
