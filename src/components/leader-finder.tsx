"use client";

import { Link } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LeaderPortrait } from "@/components/leader-portrait";
import type { SourceMark } from "@/data/source-mark";
import { swatchClass } from "@/data/source-mark";

type Line = {
  title: string;
  source: string;
  mark: SourceMark | null;
};

type Row = {
  slug: string;
  name: string;
  nameTe: string;
  party: string;
  office: string;
  photo?: string;
  lines: Line[];
};

export function LeaderFinder({ leaders }: { leaders: Row[] }) {
  const t = useTranslations("LeadersPage");
  const [query, setQuery] = useState("");
  const [party, setParty] = useState("any");
  const parties = useMemo(
    () => [...new Set(leaders.map((leader) => leader.party))],
    [leaders],
  );

  const shown = leaders.filter((leader) => {
    const haystack = `${leader.name} ${leader.nameTe} ${leader.office} ${leader.party}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesParty = party === "any" || leader.party === party;
    return matchesQuery && matchesParty;
  });

  return (
    <div className="finder">
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <div className="field">
          <label htmlFor="leader-query">{t("find")}</label>
          <input
            id="leader-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="leader-party">{t("party")}</label>
          <select
            id="leader-party"
            value={party}
            onChange={(event) => setParty(event.target.value)}
          >
            <option value="any">{t("anyParty")}</option>
            {parties.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </form>
      <p className="finder-count">{t("showing", { shown: shown.length, total: leaders.length })}</p>
      {shown.length === 0 ? (
        <p className="empty">{t("empty")}</p>
      ) : (
        <ul className="leader-grid">
          {shown.map((leader) => (
            <li key={leader.slug} className="leader-card">
              <Link href={`/leaders/${leader.slug}`} className="leader-id">
                <LeaderPortrait name={leader.name} photo={leader.photo} />
                <span className="leader-name">{leader.name}</span>
                <span className="leader-te" lang="te">
                  {leader.nameTe}
                </span>
                <span className="leader-office">{leader.office}</span>
                <span className="chip">{leader.party}</span>
              </Link>
              {leader.lines.length > 0 ? (
                <ul className="leader-lines">
                  {leader.lines.map((line) => (
                    <li key={line.title}>
                      {line.mark ? (
                        <i className={`swatch ${swatchClass(line.mark)}`} />
                      ) : (
                        <span className="swatch-spacer" aria-hidden="true" />
                      )}
                      <span>
                        <span className="line-title">{line.title}</span>
                        {line.source ? <small>{line.source}</small> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="quiet line-empty">{t("noLines")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
