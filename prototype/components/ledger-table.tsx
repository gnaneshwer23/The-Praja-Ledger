import type { Source } from "@/data/ledger";

export function LedgerTable({
  caption,
  headers,
  rows,
  note,
  sources,
}: {
  caption: string;
  headers: string[];
  rows: string[][];
  note?: string;
  sources: Source[];
}) {
  return (
    <figure className="table-block">
      <figcaption>{caption}</figcaption>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${index}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <p className="table-note">{note}</p> : null}
      <ul className="sources">
        {sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} rel="noreferrer">
              {source.title}
            </a>
            {`, ${source.publisher}, ${source.date}`}
          </li>
        ))}
      </ul>
    </figure>
  );
}
