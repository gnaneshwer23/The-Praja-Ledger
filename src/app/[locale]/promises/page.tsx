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
          government count is not an independent audit. “Operating” means the
          outlook describes the scheme as paying or running. It does not mean
          every promise made in the campaign has been met in full.
        </p>
      </header>
      <RecordList entries={entriesBySection("promises")} />
    </>
  );
}
