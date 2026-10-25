import Link from "next/link";
import { RecordList } from "@/components/record-list";
import { checkedOn, entriesByIds } from "@/data/ledger";

const index = [
  {
    href: "/leaders",
    label: "Leaders",
    text: "Seven people at the centre of the current record: the Chief Minister, the finance minister, the former Chief Minister, and the others named in a case or a 2024 parliamentary result.",
  },
  {
    href: "/cases",
    label: "Legal cases",
    text: "Two proceedings with a published status. One is awaiting a hearing. One was reported as an exoneration.",
  },
  {
    href: "/promises",
    label: "Promises",
    text: "The six guarantees, counted from the government’s own outlook, with the places where the count stops.",
  },
  {
    href: "/finances",
    label: "State finances",
    text: "The 2026–27 budget estimates, the debt stock at March 2025, and guarantees kept apart from both.",
  },
  {
    href: "/elections",
    label: "Elections",
    text: "Who won the 2023 assembly and the 2024 Lok Sabha seats, from the Election Commission.",
  },
  {
    href: "/method",
    label: "How we record",
    text: "What earns a line, and what is left out until there is a document.",
  },
];

export default function HomePage() {
  const latest = entriesByIds(["PL-C-01", "PL-H-01"]);

  return (
    <>
      <header className="title-page">
        <h1 lang="te">ప్రజా లెడ్జర్</h1>
        <p className="title-en">Praja Ledger</p>
        <p className="title-te" lang="te">
          నాయకుల పనితీరు, రికార్డుల ఆధారంగా
        </p>
        <p className="lede">
          A public register of Telangana leaders. Each line names the document
          it comes from. A charge is written as a charge. A budget figure is
          written as an estimate. Where a document was not opened, the line
          says so. Checked {checkedOn}.
        </p>
      </header>
      <h2>Latest lines</h2>
      <RecordList entries={latest} />
      <h2>In this book</h2>
      <ul className="index">
        {index.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
