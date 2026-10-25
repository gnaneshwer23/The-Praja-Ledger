"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Row = {
  slug: string;
  name: string;
  nameTe: string;
  party: string;
  office: string;
};

export function LeaderFinder({ leaders }: { leaders: Row[] }) {
  const [query, setQuery] = useState("");
  const [party, setParty] = useState("any");
  const parties = useMemo(
    () => [...new Set(leaders.map((leader) => leader.party))],
    [leaders],
  );

  const shown = leaders.filter((leader) => {
    const haystack = `${leader.name} ${leader.nameTe} ${leader.office} ${leader.party}`
      .toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesParty = party === "any" || leader.party === party;
    return matchesQuery && matchesParty;
  });

  return (
    <div className="finder">
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <div className="field">
          <label htmlFor="leader-query">Find a leader</label>
          <input
            id="leader-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="leader-party">Party</label>
          <select
            id="leader-party"
            value={party}
            onChange={(event) => setParty(event.target.value)}
          >
            <option value="any">Any party</option>
            {parties.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </form>
      <p className="finder-count">
        Showing {shown.length} of {leaders.length}
      </p>
      {shown.length === 0 ? (
        <p className="empty">No leader matches that name or party.</p>
      ) : (
        <ul className="leader-rows">
          {shown.map((leader) => (
            <li key={leader.slug}>
              <Link href={`/leaders/${leader.slug}`}>
                <span className="leader-name">{leader.name}</span>
                <span className="leader-te" lang="te">
                  {leader.nameTe}
                </span>
                <span className="leader-office">
                  {leader.party}. {leader.office}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
