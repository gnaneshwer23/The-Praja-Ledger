import { getTranslations } from "next-intl/server";
import { StageRail } from "@/components/stage-rail";
import type { Entry } from "@/data/ledger";
import { sourceMark, swatchClass } from "@/data/source-mark";

export async function RecordList({
  entries,
  showFormulaStage = false,
}: {
  entries: Entry[];
  showFormulaStage?: boolean;
}) {
  const t = await getTranslations("Records");

  return (
    <ol className="records">
      {entries.map((entry) => {
        const mark = sourceMark(entry.sources[0]);
        return (
          <li
            key={entry.id}
            id={entry.id}
            className={mark ? `record mark-${mark}` : "record"}
          >
            <div className="record-scan">
              <p className="record-id">{entry.id}</p>
              <h2>{entry.title}</h2>
              <p className={`status tone-${entry.tone}`}>
                {entry.status}
                {entry.verify ? <span className="verify"> {t("verify")}</span> : null}
              </p>
              {entry.sources[0] ? (
                <p className="record-cite">
                  {mark ? <i className={`swatch ${swatchClass(mark)}`} /> : null}
                  {entry.sources[0].publisher}
                  {" · "}
                  {entry.sources[0].date}
                </p>
              ) : null}
            </div>
            {showFormulaStage && entry.id === "PL-C-01" ? (
              <StageRail current="chargesheet" note />
            ) : null}
            <details className="read-line">
              <summary>{t("read")}</summary>
              <p>{entry.body}</p>
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
                <p className="sources">{t("noDocument")}</p>
              )}
            </details>
          </li>
        );
      })}
    </ol>
  );
}
