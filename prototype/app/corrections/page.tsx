import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Corrections",
  description: "How a line in Praja Ledger is corrected, and which corrections have been entered.",
};

export default function CorrectionsPage() {
  return (
    <>
      <header className="intro">
        <h1>Corrections</h1>
        <p>
          None have been entered in this edition. A correction names the record
          id, quotes the line that is wrong, and points to the document that
          contradicts it. The corrected line replaces the old one. The change
          log keeps both dates.
        </p>
      </header>
      <h2>What a correction needs</h2>
      <ul className="index">
        <li>
          <p>The record id, such as PL-C-01.</p>
        </li>
        <li>
          <p>The sentence that is wrong, copied as it stands.</p>
        </li>
        <li>
          <p>
            A public document that says otherwise: a judgment, an Election
            Commission table, a budget paper, or a named news report of one of
            those.
          </p>
        </li>
      </ul>
      <p className="empty">
        A rumour, a slogan, or a post without a document does not correct a
        line.
      </p>
    </>
  );
}
