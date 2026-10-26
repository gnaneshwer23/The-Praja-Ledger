import { getLocale, getTranslations } from "next-intl/server";
import { CorrectionForm, ReplyForm } from "@/components/public-forms";
import { StageRail } from "@/components/stage-rail";
import type { Entry } from "@/data/ledger";
import { sourceMark, swatchClass } from "@/data/source-mark";
import { getPublishedReplies } from "@/lib/data";
import { localizedText } from "@/lib/public/text";

export async function RecordList({
  entries,
  showFormulaStage = false,
}: {
  entries: Entry[];
  showFormulaStage?: boolean;
}) {
  const t = await getTranslations("Records");
  const corrections = await getTranslations("CorrectionsPage");
  const locale = await getLocale();
  const replies = await getPublishedReplies();

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
              <h2>{localizedText(locale, entry.title, entry.titleTe)}</h2>
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
              <p>{localizedText(locale, entry.body, entry.bodyTe)}</p>
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
            {replies
              .filter((reply) => reply.externalId === entry.id)
              .map((reply) => (
                <aside key={reply.id} className="office-reply">
                  <h3>{corrections("replyBeside", { office: reply.officeName })}</h3>
                  <p>{reply.body}</p>
                </aside>
              ))}
            <CorrectionForm
              locale={locale}
              entityType={entry.section === "cases" ? "case" : "entry"}
              publicId={entry.id}
              idPrefix={`corr-${entry.id}`}
              compact
            />
            <ReplyForm locale={locale} publicId={entry.id} idPrefix={`reply-${entry.id}`} />
          </li>
        );
      })}
    </ol>
  );
}
