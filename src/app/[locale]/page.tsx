import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CivicIcon } from "@/components/civic-icons";
import { LeaderSearch } from "@/components/leader-search";
import { QuestionPath } from "@/components/question-path";
import { SourceKey } from "@/components/source-key";
import { compiledPromiseCount } from "@/data/manifestos";
import { entries, leaders } from "@/data/ledger";
import { formatRecordDate, thisWeekOnTheRecord } from "@/data/this-week";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const profile = await getTranslations("Profile");
  const nav = await getTranslations("Nav");
  const records = await getTranslations("Records");
  const rythu = entries.find((entry) => entry.id === "PL-P-02");
  const houses = entries.find((entry) => entry.id === "PL-P-04");
  const promiseCount = compiledPromiseCount;
  const caseCount = entries.filter((entry) => entry.section === "cases").length;
  const week = thisWeekOnTheRecord(leaders, entries);
  const courtOrders = [
    {
      href: "https://tshc.gov.in/documents/currentsection_2026_04_23T11_09_12.pdf",
      label: t("orderKaleshwaram"),
    },
  ];
  const counters = [
    { key: "leaders", value: leaders.length, label: t("statsLeaders") },
    { key: "cases", value: caseCount, label: t("statsCases") },
    { key: "promises", value: promiseCount, label: t("statsPromises") },
    { key: "orders", value: courtOrders.length, label: t("statsOrders") },
  ].filter((item) => item.value > 0);

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
            <Link href="/manifestos">{nav("promises")}</Link>
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
                {t("headline")}
              </h1>
              <p className="campaign-sub" lang="te">
                {t("subhead")}
              </p>
              <LeaderSearch
                leaders={leaders.map((leader) => ({
                  slug: leader.slug,
                  name: leader.name,
                  nameTe: leader.nameTe,
                  party:
                    leader.party === "Not compiled yet" ? profile("missing") : leader.party,
                  office: leader.office,
                }))}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="landing-rest" id="records">
      <section className="section wrap week-on-record" aria-labelledby="week-title">
        <h2 id="week-title">{t("weekTitle")}</h2>
        <p className="week-rule">{t("weekRule")}</p>
        <ul className="week-list">
          {week.map((item) => {
            const leader = leaders.find((person) => person.slug === item.leaderSlug);
            const partyLabel = item.party === "others" ? t("weekOthers") : item.party;
            return (
              <li key={item.party}>
                <span className="chip">{partyLabel}</span>
                <Link href={`/leaders/${item.leaderSlug}`}>
                  {locale === "te" ? leader?.nameTe : leader?.name}
                  {". "}
                  {item.entry.title}
                </Link>
                <time dateTime={item.changedOn.toISOString().slice(0, 10)}>
                  {formatRecordDate(item.changedOn)}
                </time>
              </li>
            );
          })}
        </ul>
      </section>
      <div className="wrap">
        <section className="stats" aria-label={t("kicker")}>
          {counters.map((item) => (
            <div key={item.key}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              {item.key === "orders"
                ? courtOrders.map((order) => (
                    <a key={order.href} href={order.href} rel="noreferrer">
                      {order.label}
                    </a>
                  ))
                : null}
            </div>
          ))}
        </section>
      </div>

        <div className="wrap cards hero-cards">
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
              <Link href="/manifestos/congress-2023/rythu-bharosa-acre">{t("openRecord")}</Link>
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
              <Link href="/manifestos/congress-2023/indiramma-indlu">{t("openRecord")}</Link>
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
        <p className="coming-next">{t("comingNext")}</p>
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
          <Link href="/constituencies" className="ghost">
            {t("constituencies")}
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
