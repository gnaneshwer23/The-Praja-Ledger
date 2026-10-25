import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LeaderSearch } from "@/components/leader-search";
import { ShareSheet } from "@/components/share-sheet";
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
  const formula = entries.find((entry) => entry.id === "PL-C-01");
  const rythu = entries.find((entry) => entry.id === "PL-P-02");
  const houses = entries.find((entry) => entry.id === "PL-P-04");
  const promiseCount = entries.filter(
    (entry) => entry.section === "promises" && entry.id !== "PL-P-07",
  ).length;
  const caseCount = entries.filter((entry) => entry.section === "cases").length;

  return (
    <div className="landing">
      <div className="wrap hero">
        <div>
          <p className="kicker">{t("kicker")}</p>
          <h1>{t("headline")}</h1>
          <p className="subhead" lang="te">
            {t("subhead")}
          </p>
          <p className="lede">{t("lede")}</p>
          <LeaderSearch
            leaders={leaders.map((leader) => ({
              slug: leader.slug,
              name: leader.name,
              nameTe: leader.nameTe,
              party: leader.party,
              office: leader.office,
            }))}
          />
        </div>
        <div className="cards">
          <article className="record-card media">
            <div className="card-top">
              <h2>{t("formulaTitle")}</h2>
              <span className="status">{t("formulaStatus")}</span>
            </div>
            <p className="who">{t("formulaWho")}</p>
            <StageRail current="chargesheet" />
            <p>{t("formulaDetail")}</p>
            <p className="hearing">{t("formulaHearing")}</p>
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
            <p>{t("rythuDetail")}</p>
            <p>{t("rythuGap")}</p>
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
            <p>{t("houseDetail")}</p>
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
      </div>

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

      <section className="section wrap">
        <h2>{t("closerTitle")}</h2>
        <p className="lede">{t("closerLede")}</p>
        <div className="split-3">
          <article className="plain-card">
            <h3>{t("followTitle")}</h3>
            <p>{t("followBody")}</p>
            <p>
              <Link href="/community">{t("followTitle")}</Link>
            </p>
          </article>
          <article className="plain-card">
            <h3>{t("askTitle")}</h3>
            <p>{t("askBody")}</p>
            <p>
              <Link href="/ask">{t("askTitle")}</Link>
            </p>
          </article>
          <article className="plain-card">
            <h3>{t("shareTitle")}</h3>
            <p>{t("shareBody")}</p>
          </article>
        </div>
      </section>

      <section className="section wrap rules" id="rules">
        <div>
          <h2>{t("rulesTitle")}</h2>
          <p className="lede">{t("rulesLede")}</p>
          <p className="legend">
            <span>
              <i className="swatch court" />
              {t("legendCourt")}
            </span>
            <span>
              <i className="swatch media" />
              {t("legendMedia")}
            </span>
            <span>
              <i className="swatch claim" />
              {t("legendClaim")}
            </span>
          </p>
          <p className="quiet">{t("legendNote")}</p>
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
          <ol className="steps">
            <li>
              <span>1</span>
              <h3>{t("step1Title")}</h3>
              <p>{t("step1Body")}</p>
            </li>
            <li>
              <span>2</span>
              <h3>{t("step2Title")}</h3>
              <p>{t("step2Body")}</p>
            </li>
            <li>
              <span>3</span>
              <h3>{t("step3Title")}</h3>
              <p>{t("step3Body")}</p>
            </li>
            <li>
              <span>4</span>
              <h3>{t("step4Title")}</h3>
              <p>{t("step4Body")}</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section wrap start">
        <div>
          <h2>{t("startTitle")}</h2>
          <p className="lede">{t("startBody")}</p>
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
  );
}
