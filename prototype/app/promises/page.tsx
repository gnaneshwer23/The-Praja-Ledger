import type { Metadata } from "next";
import { RecordList } from "@/components/record-list";
import { entriesBySection } from "@/data/ledger";

export const metadata: Metadata = {
  title: "Promises",
  description:
    "The six Telangana guarantees, counted from the Socio-Economic Outlook 2026 and the 2026–27 budget analysis.",
};

export default function PromisesPage() {
  return (
    <>
      <header className="intro">
        <h1>Promises</h1>
        <p>
          These are the six guarantees of the government that took office after
          the 2023 election. The counts below are the government’s, from the
          Socio-Economic Outlook 2026, unless a line names a newspaper. A
          government count is not an independent audit. A sourced figure has to
          meet the sourced target before a promise is called delivered as
          promised.
        </p>
      </header>
      <RecordList entries={entriesBySection("promises")} />
    </>
  );
}
