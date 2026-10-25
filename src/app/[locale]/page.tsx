import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CivicIcon } from "@/components/civic-icons";
import { LeaderSearch } from "@/components/leader-search";
import { QuestionPath } from "@/components/question-path";
import { ShareSheet } from "@/components/share-sheet";
import { SourceKey } from "@/components/source-key";
import { StageRail } from "@/components/stage-rail";
import { entries, leaders } from "@/data/ledger";
import en from "../../../messages/en.json";
import te from "../../../messages/te.json";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const nav = await getTranslations("Nav");
  const records = await getTranslations("Records");
  const formula = entries.find((entry) => entry.id === "PL-C-01");
  const rythu = entries.find((entry) => entry.id === "PL-P-02");
  const houses = entries.find((entry) => entry.id === "PL-P-04");
  const promiseCount = entries.filter(
    (entry) => entry.section === "promises" && entry.id !== "PL-P-07",
  ).length;
  const caseCount = entries.filter((entry) => entry.section === "cases").length;

  return (
    <div className="landing">
      <div className="campaign">
        <div className="campaign-card">
          <nav className="campaign-nav" aria-label={nav("menu")}>
            <Link href="/" className="campaign-brand">
              <span className="campaign-mark" aria-hidden="true" />
              {nav("home")}
            </Link>
            <Link href="/leaders">{nav("leaders")}</Link>
            <Link href="/cases">{nav("cases")}</Link>
            <Link href="/promises">{nav("promises")}</Link>
            <Link href="/ask">{nav("ask")}</Link>
            <Link href="/method">{nav("method")}</Link>
            <Link href="/" locale={locale === "te" ? "en" : "te"} className="campaign-lang">
              {nav("language")}
            </Link>
            <Link href="/leaders" className="campaign-cta">
              {nav("find")}
            </Link>
          </nav>
          <div className="campaign-hero">
            <div>
              <p className="campaign-kicker">{t("kicker")}</p>
              <h1 className={locale === "te" ? "campaign-title is-te" : "campaign-title"}>
                {locale === "te" ? (
                  <>
                    <span>ప్రజా</span>
                    <span>లెడ్జర్</span>
                  </>
                ) : (
                  <>
                    <span className="line-blue">Praja</span>
                    <span className="line-ink">Ledger</span>
                  </>
                )}
              </h1>
              <p className="campaign-sub" lang="te">
                {t("subhead")}
              </p>
              <LeaderSearch
                leaders={leaders.map((leader) => ({
                  slug: leader.slug,
                  name: leader.name,
                  nameTe: leader.nameTe,
                  party: leader.party,
                  office: leader.office,
                  photo: leader.photo,
                }))}
              />
            </div>
            {locale === "te" ? (
              <p className="campaign-poster latin">
                Praja
                <br />
                Ledger
              </p>
            ) : (
              <p className="campaign-poster" lang="te">
                ప్రజా
                <br />
                లెడ్జర్
              </p>
            )}
            <aside className="campaign-aside">
              <Link href="/cases/formula-e">{t("seeRecord")}</Link>
              <p>{t("headline")}</p>
              <hr />
              <p className="hearing-label">{t("hearingLabel")}</p>
              <p className="hearing-day">{t("hearingDay")}</p>
              <p className="hearing-year">{t("hearingYear")}</p>
            </aside>
          </div>
          <a className="orbit" href="#records">
            <svg viewBox="0 0 140 140" aria-hidden="true">
              <defs>
                <path
                  id="orbit-path"
                  d="M70,70 m-48,0 a48,48 0 1,1 96,0 a48,48 0 1,1 -96,0"
                />
              </defs>
              <text>
                <textPath href="#orbit-path">{t("orbit")}</textPath>
              </text>
            </svg>
            <span>↓</span>
          </a>
        </div>
      </div>
      <div className="landing-rest" id="records">
      <div className="wrap">
        <section className="stats" aria-label={t("kicker")}>
          <div>
            <strong>{leaders.length}</strong>
            <span>{t("statsLeaders")}</span>
          </div>
          <div>
            <strong>{caseCount}</strong>
            <span>{t("statsCases")}</span>
          </div>
          <div>
            <strong>{promiseCount}</strong>
            <span>{t("statsPromises")}</span>
          </div>
          <div>
            <strong>0</strong>
            <span>{t("statsOrders")}</span>
          </div>
        </section>
      </div>

        <div className="wrap cards hero-cards">
          <article className="record-card media">
            <div className="card-top">
              <h2>{t("formulaTitle")}</h2>
              <span className="status">{t("formulaStatus")}</span>
            </div>
            <p className="who">{t("formulaWho")}</p>
            <StageRail current="chargesheet" note />
            <p className="hearing">{t("formulaHearing")}</p>
            <details className="read-line">
              <summary>{records("read")}</summary>
              <p>{t("formulaDetail")}</p>
            </details>
            <div className="card-links">
              {formula ? (
                <a href={formula.sources[0]?.url} rel="noreferrer">
                  {t("formulaSource")}
                </a>
              ) : null}
              <Link href="/cases/formula-e">{t("openRecord")}</Link>
              <ShareSheet
                path="/cases/formula-e"
                english={en.Share}
                telugu={te.Share}
              />
            </div>
          </article>
          <article className="record-card claim">
            <div className="card-top">
              <h2>{t("rythuTitle")}</h2>
              <span className="status">{t("rythuStatus")}</span>
            </div>
            <p className="who">{t("rythuWho")}</p>
            <details className="read-line">
              <summary>{records("read")}</summary>
              <p>{t("rythuDetail")}</p>
              <p>{t("rythuGap")}</p>
            </details>
            <div className="card-links">
              {rythu ? (
                <a href={rythu.sources[0]?.url} rel="noreferrer">
                  {t("rythuSource")}
                </a>
              ) : null}
              <Link href="/promises">{t("openRecord")}</Link>
            </div>
          </article>
          <article className="record-card claim">
            <div className="card-top">
              <h2>{t("houseTitle")}</h2>
              <span className="status">{t("houseStatus")}</span>
            </div>
            <p className="who">{t("houseWho")}</p>
            <details className="read-line">
              <summary>{records("read")}</summary>
              <p>{t("houseDetail")}</p>
            </details>
            <div className="card-links">
              {houses ? (
                <a href={houses.sources[0]?.url} rel="noreferrer">
                  {t("houseSource")}
                </a>
              ) : null}
              <Link href="/promises">{t("openRecord")}</Link>
            </div>
          </article>
        </div>
        <div className="wrap source-row">
          <SourceKey />
        </div>

      <section className="section wrap">
        <h2>{t("closerTitle")}</h2>
        <p className="lede">{t("closerLede")}</p>
        <div className="split-3">
          <article className="plain-card">
            <CivicIcon name="follow" />
            <h3>{t("followTitle")}</h3>
            <p>{t("followBody")}</p>
            <p>
              <Link href="/community">{t("followTitle")}</Link>
            </p>
          </article>
          <article className="plain-card">
            <CivicIcon name="ask" />
            <h3>{t("askTitle")}</h3>
            <p>{t("askBody")}</p>
            <p>
              <Link href="/ask">{t("askTitle")}</Link>
            </p>
          </article>
          <article className="plain-card">
            <CivicIcon name="share" />
            <h3>{t("shareTitle")}</h3>
            <p>{t("shareBody")}</p>
          </article>
        </div>
      </section>

      <section className="section wrap rules" id="rules">
        <div>
          <h2>{t("rulesTitle")}</h2>
          <p className="lede">{t("rulesLede")}</p>
        </div>
        <div className="rule-grid">
          <article>
            <h3>{t("ruleSourceTitle")}</h3>
            <p>{t("ruleSourceBody")}</p>
          </article>
          <article>
            <h3>{t("ruleCaseTitle")}</h3>
            <p>{t("ruleCaseBody")}</p>
          </article>
          <article>
            <h3>{t("ruleReplyTitle")}</h3>
            <p>{t("ruleReplyBody")}</p>
          </article>
          <article>
            <h3>{t("ruleCommunityTitle")}</h3>
            <p>{t("ruleCommunityBody")}</p>
          </article>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>{t("stepsTitle")}</h2>
          <QuestionPath />
        </div>
      </section>

      <section className="section wrap start">
        <div>
          <h2>{t("startTitle")}</h2>
          <p className="lede">{t("startBody", { count: leaders.length })}</p>
        </div>
        <div className="start-actions">
          <Link href="/leaders" className="ink-button">
            {t("startFind")}
          </Link>
          <Link href="/corrections" className="ghost">
            {t("startClaim")}
          </Link>
        </div>
      </section>
      </div>
    </div>
  );
}
