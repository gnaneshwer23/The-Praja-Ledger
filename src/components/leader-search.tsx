"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type LeaderHit = {
  slug: string;
  name: string;
  nameTe: string;
  party: string;
  office: string;
};

export function LeaderSearch({ leaders }: { leaders: LeaderHit[] }) {
  const t = useTranslations("Landing");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const matches = useMemo(() => {
    const needle = submitted.trim().toLowerCase();
    if (!needle) return [];
    return leaders.filter((leader) =>
      [leader.name, leader.nameTe, leader.party, leader.office]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [leaders, submitted]);

  return (
    <form
      className="search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(query);
      }}
    >
      <label htmlFor="leader-search">{t("searchLabel")}</label>
      <div className="search-row">
        <input
          id="leader-search"
          value={query}
          placeholder={t("searchPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="ink-button" type="submit">
          {t("searchButton")}
        </button>
      </div>
      <p className="search-hint">
        <Link href="/leaders">{t("searchHint")}</Link>
      </p>
      {submitted ? (
        matches.length > 0 ? (
          <ul className="search-results">
            {matches.map((leader) => (
              <li key={leader.slug}>
                <Link href={`/leaders/${leader.slug}`}>
                  {leader.name}
                  <br />
                  <small lang="te">{leader.nameTe}</small>
                  <br />
                  <small>
                    {leader.party}. {leader.office}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="search-hint">{t("searchEmpty")}</p>
        )
      ) : null}
    </form>
  );
}
