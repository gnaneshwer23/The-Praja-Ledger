import type { Metadata } from "next";
import { RecordList } from "@/components/record-list";
import { entriesBySection } from "@/data/ledger";

export const metadata: Metadata = {
  title: "Legal cases",
  description:
    "Court proceedings entered in Praja Ledger, with the news report each status comes from.",
};

export default function CasesPage() {
  return (
    <>
      <header className="intro">
        <h1>Legal cases</h1>
        <p>
          A case is listed when a named newsroom has published its status.
          Registration, a chargesheet, and a discharge petition are steps in a
          case. They are not a finding that the person committed the act.
          Where a court has decided, the line says what the report says the
          court did, and whether the order itself was opened.
        </p>
      </header>
      <RecordList entries={entriesBySection("cases")} />
    </>
  );
}
