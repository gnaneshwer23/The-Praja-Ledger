import type { Entry } from "@/data/ledger";

export function RecordList({ entries }: { entries: Entry[] }) {
  return (
    <ol className="records">
      {entries.map((entry) => (
        <li key={entry.id} id={entry.id} className="record">
          <p className="record-id">{entry.id}</p>
          <h2>{entry.title}</h2>
          <p>{entry.body}</p>
          <p className={`status tone-${entry.tone}`}>{entry.status}</p>
          {entry.sources.length > 0 ? (
            <ul className="sources">
              {entry.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} rel="noreferrer">
                    {source.title}
                  </a>
                  {`, ${source.publisher}, ${source.date}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="sources">
              This line describes the edition itself. It has no external
              document.
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
