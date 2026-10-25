import type { Metadata } from "next";
import { LedgerTable } from "@/components/ledger-table";
import { RecordList } from "@/components/record-list";
import { entriesByIds, entriesBySection } from "@/data/ledger";

export const metadata: Metadata = {
  title: "Elections",
  description:
    "Telangana assembly results from 2023 and Lok Sabha results from 2024, from the Election Commission.",
};

const assemblySource = entriesByIds(["PL-E-01"])[0].sources;
const lokSabhaSource = entriesByIds(["PL-E-02"])[0].sources;

export default function ElectionsPage() {
  return (
    <>
      <header className="intro">
        <h1>Elections</h1>
        <p>
          Seat totals below are the Election Commission’s. The assembly figures
          come from the final statistical report. The Lok Sabha figures come
          from the Commission’s result pages for the 2024 election.
        </p>
      </header>
      <LedgerTable
        caption="Legislative Assembly, 2023. 119 seats. Majority at 60."
        headers={["Party", "Seats", "Share of valid votes"]}
        rows={[
          ["Indian National Congress", "64", "39.69%"],
          ["Bharat Rashtra Samithi", "39", "37.62%"],
          ["Bharatiya Janata Party", "8", "14%"],
          ["All India Majlis-e-Ittehadul Muslimeen", "7", "2.23%"],
          ["Communist Party of India", "1", "0.35%"],
        ]}
        note="The Commission’s report writes Bharat Rashtra Samithi as BHRS. Ten of the 119 successful candidates were women."
        sources={assemblySource}
      />
      <LedgerTable
        caption="Lok Sabha, 2024. 17 seats."
        headers={["Party", "Seats"]}
        rows={[
          ["Bharatiya Janata Party", "8"],
          ["Indian National Congress", "8"],
          ["All India Majlis-e-Ittehadul Muslimeen", "1"],
          ["Bharat Rashtra Samithi", "0"],
        ]}
        sources={lokSabhaSource}
      />
      <RecordList entries={entriesBySection("elections")} />
    </>
  );
}
