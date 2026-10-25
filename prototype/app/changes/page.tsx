import type { Metadata } from "next";
import { RecordList } from "@/components/record-list";
import { entriesBySection } from "@/data/ledger";

export const metadata: Metadata = {
  title: "Change log",
  description: "What changed in Praja Ledger, edition by edition.",
};

export default function ChangesPage() {
  return (
    <>
      <header className="intro">
        <h1>Change log</h1>
        <p>
          A change is a new line, a rewritten line, or a line withdrawn. The
          old wording stays listed here when a later edition replaces it.
        </p>
      </header>
      <RecordList entries={entriesBySection("changes")} />
    </>
  );
}
