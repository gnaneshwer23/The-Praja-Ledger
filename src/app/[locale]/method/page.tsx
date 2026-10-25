import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "How we record",
  description:
    "The rules Praja Ledger uses before a line about a Telangana leader is written down.",
};

export default async function MethodPage() {
  const t = await getTranslations("MethodManifesto");

  return (
    <article className="method">
      <header className="intro">
        <h1>How we record</h1>
        <p>
          Praja Ledger writes down what a public document already says about a
          Telangana leader, an election, a scheme, or the state’s accounts. The
          checked date on every page is the day those documents were read for
          this edition.
        </p>
      </header>
      <h2>What earns a line</h2>
      <p>
        A line has to be checkable. The usual documents are an Election
        Commission report, a paper of the state government, a budget analysis
        that cites those papers, or a news report that names the court date,
        the order, or the person who said the thing.
      </p>
      <h2>What a status word means</h2>
      <p>
        Pending means a court date or an unfinished payment is still open. A
        discharge is written only as the news report described it, until the
        order is opened. A discharge is not a conviction. An estimate is a
        budget number, not money already spent.
      </p>
      <h2>{t("title")}</h2>
      <p>{t("intro")}</p>
      <p>{t("delivered")}</p>
      <p>{t("partial")}</p>
      <p>{t("progress")}</p>
      <p>{t("notStarted")}</p>
      <p>{t("dropped")}</p>
      <p>{t("unverified")}</p>
      <h2>{t("rulesTitle")}</h2>
      <p>{t("ruleFrozen")}</p>
      <p>{t("ruleEmpty")}</p>
      <p>{t("ruleMonth")}</p>
      <p>{t("ruleGap")}</p>
      <p>{t("ruleClaim")}</p>
      <h2>{t("freezeTitle")}</h2>
      <p>{t("freezeCongress")}</p>
      <p>{t("freezeBrs2014")}</p>
      <p>{t("freezeBrs2018")}</p>
      <p>{t("freezeBjpUnion")}</p>
      <p>{t("freezeBrs2023")}</p>
      <p>{t("freezeBjp2023")}</p>
      <h2>What stays out</h2>
      <p>
        Speeches that are not tied to a count. Social-media claims. Anything
        attributed only to “sources.” A chargesheet rewritten as if the trial
        had ended. A percentage turned into a rupee figure the source did not
        print. Leaders who hold office but have no separate line yet. This
        edition leaves out most ministers and most MLAs for that reason.
      </p>
      <h2>Whose numbers</h2>
      <p>
        Scheme counts are the government’s unless a line names another
        publisher. Debt figures say which measure they are, because public
        debt, outstanding liabilities, and guarantees are not the same pile of
        money. Party names follow the document being quoted. The Commission’s
        assembly report writes BHRS for Bharat Rashtra Samithi.
      </p>
      <h2>What this site is not</h2>
      <p>
        It is not the Government of Telangana. It is not a court, and it is not
        legal advice. Reading a line here is not a finding of guilt or of
        innocence.
      </p>
    </article>
  );
}
