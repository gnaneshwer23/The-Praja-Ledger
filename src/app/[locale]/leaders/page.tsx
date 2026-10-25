import type { Metadata } from "next";
import { LeaderFinder } from "@/components/leader-finder";
import { leaders } from "@/data/ledger";

export const metadata: Metadata = {
  title: "Leaders",
  description:
    "Leaders entered in Praja Ledger, with the office each one currently holds on the public record.",
};

export default function LeadersPage() {
  return (
    <>
      <header className="intro">
        <h1>Leaders</h1>
        <p>
          This edition follows seven people. The council of ministers has more
          names than these. They are left out until this book has a separate
          line to attach to them. Party names are the short forms used in the
          filter. The assembly list spells Bharat Rashtra Samithi as BHRS.
        </p>
      </header>
      <LeaderFinder
        leaders={leaders.map((leader) => ({
          slug: leader.slug,
          name: leader.name,
          nameTe: leader.nameTe,
          party: leader.party,
          office: leader.office,
        }))}
      />
    </>
  );
}
