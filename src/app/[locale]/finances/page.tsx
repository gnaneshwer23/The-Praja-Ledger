import type { Metadata } from "next";
import { LedgerTable } from "@/components/ledger-table";
import { RecordList } from "@/components/record-list";
import { entriesByIds, entriesBySection } from "@/data/ledger";

export const metadata: Metadata = {
  title: "State finances",
  description:
    "Telangana budget estimates for 2026–27, public debt at 31 March 2025, and outstanding guarantees.",
};

const budgetSource = entriesByIds(["PL-F-01"])[0].sources;
const debtSource = entriesByIds(["PL-F-03"])[0].sources;

export default function FinancesPage() {
  return (
    <>
      <header className="intro">
        <h1>State finances</h1>
        <p>
          These figures are kept apart. The budget estimate is a plan for
          2026–27. The public-debt stock is what the annexure said was owed on
          31 March 2025. Outstanding liabilities are a wider percentage of GSDP,
          and guarantees sit outside that percentage. A December 2025 total,
          reported from a government document, is in the records below. It is
          not that March 2025 stock.
        </p>
      </header>
      <LedgerTable
        caption="Budget, in Rs crore"
        headers={["", "2024–25 actuals", "2025–26 revised", "2026–27 budgeted"]}
        rows={[
          ["GSDP", "16,09,279", "17,82,004", "19,61,701"],
          ["Expenditure, excluding debt repayment", "2,18,251", "2,61,211", "3,01,209"],
          ["Debt repayment", "1,42,701", "20,128", "23,025"],
          ["Receipts, excluding borrowings", "1,69,329", "2,05,078", "2,42,750"],
          ["Fiscal deficit", "48,922", "56,133", "58,459"],
          ["Revenue balance", "−9,420", "591", "6,858"],
        ]}
        note="A minus sign is a revenue deficit. PRS says the large borrowing and repayment in 2024–25 include Rs 1,29,376 crore of short-term advances from the RBI, and the repayment of those advances. The 2026–27 fiscal deficit is 3% of GSDP. The revenue surplus that year is estimated at 0.3% of GSDP."
        sources={budgetSource}
      />
      <LedgerTable
        caption="Public debt as on 31 March 2025, in Rs crore"
        headers={["Head", "Amount"]}
        rows={[
          ["Open market loans", "3,57,637.07"],
          ["Loans from the central government", "13,296.23"],
          ["Loans from autonomous bodies", "11,209.93"],
          ["Ways and means advances, including overdraft", "5,841.95"],
          ["Special securities to the National Small Savings Fund", "3,895.86"],
          ["Public debt", "3,91,881.04"],
        ]}
        note="Do not add this stock to the 28.7% liability estimate. They are different measures, taken at different dates."
        sources={debtSource}
      />
      <RecordList entries={entriesBySection("finances")} />
    </>
  );
}
