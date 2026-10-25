"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function CommunityFeed() {
  const t = useTranslations("Community");
  const stages = useTranslations("Stages");
  const [tab, setTab] = useState<"following" | "constituency" | "changes">(
    "following",
  );

  return (
    <section className="app-screen">
      <div className="app-top">
        <strong>{t("title")}</strong>
      </div>
      <div className="app-tabs" role="tablist" aria-label={t("title")}>
        {(["following", "constituency", "changes"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {t(key)}
          </button>
        ))}
      </div>
      <div className="app-body">
        {tab === "following" ? (
          <>
            <article className="feed-card">
              <p className="kicker">{t("coming")}</p>
              <h2>{t("formulaTitle")}</h2>
              <p>{t("formulaWhere")}</p>
              <ol className="stages" aria-label={stages("label")}>
                {(
                  ["allegation", "fir", "chargesheet", "charges", "trial", "verdict"] as const
                ).map((stage) => (
                  <li
                    key={stage}
                    className={
                      stage === "chargesheet"
                        ? "now"
                        : stage === "allegation" || stage === "fir"
                          ? "done"
                          : ""
                    }
                  >
                    <span />
                    <small>{stages(stage)}</small>
                  </li>
                ))}
              </ol>
              <p>
                <Link href="/cases/formula-e">{t("comments")}</Link>
              </p>
            </article>
            <article className="feed-card claim">
              <p className="example">{t("example")}</p>
              <p className="kicker">{t("updateKicker")}</p>
              <p>{t("updateOffice")}</p>
              <p>{t("updateBody")}</p>
              <p>
                <Link href="/promises">{t("updateLink")}</Link>
              </p>
            </article>
            <article className="feed-card">
              <p className="example">{t("example")}</p>
              <p className="kicker">{t("questionKicker")}</p>
              <h2>
                <Link href="/ask/example">{t("questionTitle")}</Link>
              </h2>
              <p>{t("questionMeta")}</p>
              <p className="quiet">
                {t("meToo")} · {t("openQuestion")}
              </p>
            </article>
          </>
        ) : null}
        {tab === "constituency" ? (
          <article className="feed-card">
            <h2>{t("constituency")}</h2>
            <p>{t("constituencyEmpty")}</p>
            <p>
              <Link href="/leaders">{t("constituencyAction")}</Link>
            </p>
          </article>
        ) : null}
        {tab === "changes" ? (
          <article className="feed-card">
            <h2>{t("changes")}</h2>
            <p>{t("changesBody")}</p>
            <p>
              <Link href="/changes">{t("changes")}</Link>
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
