import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "MethodPage" });
  return { title: t("title"), description: t("description") };
}

export default async function MethodPage() {
  const t = await getTranslations("MethodPage");
  const manifesto = await getTranslations("MethodManifesto");

  return (
    <article className="method">
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <h2>{t("earnsTitle")}</h2>
      <ul className="doc-key">
        <li>
          <Glyph kind="commission" />
          <span>{t("docCommission")}</span>
        </li>
        <li>
          <Glyph kind="paper" />
          <span>{t("docPaper")}</span>
        </li>
        <li>
          <Glyph kind="budget" />
          <span>{t("docBudget")}</span>
        </li>
        <li>
          <Glyph kind="news" />
          <span>{t("docNews")}</span>
        </li>
      </ul>
      <p className="panel">{t("earnsBody")}</p>
      <h2>{t("statusTitle")}</h2>
      <ul className="word-key">
        <li>
          <Glyph kind="pending" />
          <strong>{t("wordPending")}</strong>
          <p>{t("pendingMeans")}</p>
        </li>
        <li>
          <Glyph kind="discharge" />
          <strong>{t("wordDischarge")}</strong>
          <p>{t("dischargeMeans")}</p>
        </li>
        <li>
          <Glyph kind="estimate" />
          <strong>{t("wordEstimate")}</strong>
          <p>{t("estimateMeans")}</p>
        </li>
      </ul>
      <h2>{manifesto("title")}</h2>
      <p className="panel">{manifesto("intro")}</p>
      <ul className="status-board">
        <li><p>{manifesto("delivered")}</p></li>
        <li><p>{manifesto("partial")}</p></li>
        <li><p>{manifesto("progress")}</p></li>
        <li><p>{manifesto("notStarted")}</p></li>
        <li><p>{manifesto("dropped")}</p></li>
        <li><p>{manifesto("unverified")}</p></li>
      </ul>
      <h2>{manifesto("rulesTitle")}</h2>
      <ul className="rule-board">
        <li><p>{manifesto("ruleFrozen")}</p></li>
        <li><p>{manifesto("ruleEmpty")}</p></li>
        <li><p>{manifesto("ruleMonth")}</p></li>
        <li><p>{manifesto("ruleGap")}</p></li>
        <li><p>{manifesto("ruleClaim")}</p></li>
      </ul>
      <h2>{manifesto("freezeTitle")}</h2>
      <ul className="freeze-board">
        <li><p>{manifesto("freezeCongress")}</p></li>
        <li><p>{manifesto("freezeBrs2014")}</p></li>
        <li><p>{manifesto("freezeBrs2018")}</p></li>
        <li><p>{manifesto("freezeBjpUnion")}</p></li>
        <li><p>{manifesto("freezeBrs2023")}</p></li>
        <li><p>{manifesto("freezeBjp2023")}</p></li>
      </ul>
      <h2>{t("outTitle")}</h2>
      <ul className="rule-board">
        <li><p>{t("outSpeech")}</p></li>
        <li><p>{t("outSocial")}</p></li>
        <li><p>{t("outSources")}</p></li>
        <li><p>{t("outSheet")}</p></li>
        <li><p>{t("outPercent")}</p></li>
        <li><p>{t("outLeaders")}</p></li>
      </ul>
      <h2>{t("numbersTitle")}</h2>
      <ul className="rule-board">
        <li><p>{t("numbersSchemes")}</p></li>
        <li><p>{t("numbersDebt")}</p></li>
        <li><p>{t("numbersParty")}</p></li>
      </ul>
      <h2>{t("notTitle")}</h2>
      <ul className="rule-board">
        <li><p>{t("notGov")}</p></li>
        <li><p>{t("notCourt")}</p></li>
        <li><p>{t("notFinding")}</p></li>
      </ul>
    </article>
  );
}

function Glyph({
  kind,
}: {
  kind: "commission" | "paper" | "budget" | "news" | "pending" | "discharge" | "estimate";
}) {
  return (
    <svg className="glyph" viewBox="0 0 48 48" aria-hidden="true">
      {kind === "commission" ? (
        <>
          <rect x="8" y="6" width="32" height="36" rx="3" fill="#e7efc2" stroke="#102028" strokeWidth="2" />
          <path d="M16 16h16M16 23h16M16 30h10" stroke="#102028" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "paper" ? (
        <>
          <path d="M12 6h16l8 8v28H12z" fill="#fff" stroke="#102028" strokeWidth="2" />
          <path d="M28 6v8h8M18 22h12M18 28h12M18 34h8" stroke="#102028" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "budget" ? (
        <>
          <rect x="7" y="10" width="34" height="28" rx="3" fill="#fff" stroke="#102028" strokeWidth="2" />
          <path d="M7 18h34M18 18v20M31 18v20" stroke="#102028" strokeWidth="2" />
        </>
      ) : null}
      {kind === "news" ? (
        <>
          <rect x="6" y="8" width="36" height="32" rx="3" fill="#fff" stroke="#102028" strokeWidth="2" />
          <path d="M12 16h10M12 22h10M12 28h8M26 16h8M26 22h8M26 28h8" stroke="#0e6f7a" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "pending" ? (
        <circle cx="24" cy="24" r="12" fill="#fff" stroke="#0e6f7a" strokeWidth="3" />
      ) : null}
      {kind === "discharge" ? (
        <>
          <rect x="10" y="8" width="28" height="32" rx="3" fill="#e7efc2" stroke="#102028" strokeWidth="2" />
          <path d="M16 24h16" stroke="#102028" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "estimate" ? (
        <>
          <path d="M12 34V22M24 34V14M36 34V26" stroke="#102028" strokeWidth="4" strokeLinecap="round" />
          <path d="M8 38h32" stroke="#d4df96" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}
