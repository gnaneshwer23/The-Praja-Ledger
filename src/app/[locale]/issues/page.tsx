import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { publicIssues } from "@/data/issues";

const transcriptIssues = [
  ["voterRollsTitle", "voterRollsBody"],
  ["policeTitle", "policeBody"],
  ["justiceTitle", "justiceBody"],
  ["equityTitle", "equityBody"],
  ["welfareTitle", "welfareBody"],
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Issues" });
  return { title: t("title"), description: t("lede") };
}

export default async function IssuesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Issues");

  return (
    <div className="issues-page">
      <header className="issues-hero">
        <p className="kicker">{t("kicker")}</p>
        <h1>{t("title")}</h1>
        <p className="lede">{t("lede")}</p>
        <p className="issues-method-note">{t("methodNote")}</p>
      </header>

      <section className="issues-section" aria-labelledby="transcript-issues">
        <div className="issues-section-head">
          <div>
            <p className="kicker">{t("transcriptLabel")}</p>
            <h2 id="transcript-issues">{t("transcriptHeading")}</h2>
          </div>
          <p>{t("transcriptNote")}</p>
        </div>
        <ul className="transcript-issue-list">
          {transcriptIssues.map(([titleKey, bodyKey]) => (
            <li key={titleKey}>
              <h3>{t(titleKey)}</h3>
              <p>{t(bodyKey)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="issues-section" aria-labelledby="telangana-issues">
        <div className="issues-section-head">
          <div>
            <p className="kicker">{t("telanganaLabel")}</p>
            <h2 id="telangana-issues">{t("telanganaHeading")}</h2>
          </div>
          <p>{t("snapshotNote")}</p>
        </div>
        <div className="issue-grid">
          {publicIssues.filter((issue) => issue.category === "telangana").map((issue) => (
            <article className="issue-card" key={issue.id}>
              <div className="issue-card-top">
                <span className="issue-scope">{t(issue.scopeKey)}</span>
                <span className="issue-period">{t(issue.periodKey)}</span>
              </div>
              <h3>{t(issue.titleKey)}</h3>
              <p className="issue-metric">{issue.metric}</p>
              <p>{t(issue.summaryKey)}</p>
              <p className="issue-caveat">{t(issue.caveatKey)}</p>
              <div className="issue-source">
                <span>{t("sourceLabel")}</span>
                <a href={issue.sourceUrl} target="_blank" rel="noreferrer">
                  {t(issue.sourceLabelKey)} ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="issues-section" aria-labelledby="india-issues">
        <div className="issues-section-head">
          <div>
            <p className="kicker">{t("indiaLabel")}</p>
            <h2 id="india-issues">{t("indiaHeading")}</h2>
          </div>
          <p>{t("indiaNote")}</p>
        </div>
        <div className="issue-grid issue-grid-single">
          {publicIssues.filter((issue) => issue.category === "india").map((issue) => (
            <article className="issue-card" key={issue.id}>
              <div className="issue-card-top">
                <span className="issue-scope">{t(issue.scopeKey)}</span>
                <span className="issue-period">{t(issue.periodKey)}</span>
              </div>
              <h3>{t(issue.titleKey)}</h3>
              <p className="issue-metric">{issue.metric}</p>
              <p>{t(issue.summaryKey)}</p>
              <p className="issue-caveat">{t(issue.caveatKey)}</p>
              <div className="issue-source">
                <span>{t("sourceLabel")}</span>
                <a href={issue.sourceUrl} target="_blank" rel="noreferrer">
                  {t(issue.sourceLabelKey)} ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="issues-next">
        <div>
          <p className="kicker">{t("nextKicker")}</p>
          <h2>{t("nextTitle")}</h2>
          <p>{t("nextBody")}</p>
        </div>
        <Link className="ink-button" href="/corrections">{t("suggest")}</Link>
      </section>
    </div>
  );
}

