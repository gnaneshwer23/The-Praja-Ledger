import { getTranslations } from "next-intl/server";
import { FormAlerts } from "@/components/admin/form-alerts";
import { TranslationUpload } from "@/components/admin/translation-upload";
import { approveTranslation, stageTranslation, takeFormError } from "@/lib/actions/editorial";
import { snippet } from "@/lib/admin/format";
import { requireConsole } from "@/lib/auth/console";
import { loadRows } from "@/lib/data/editor";

type StageRow = {
  id: string;
  kind: string;
  entity_key: string;
  field: string;
  english_text: string;
  telugu: string;
  created_by: string;
};

export const instant = false;

const kinds = ["person", "case", "promise", "message"] as const;
const fields = ["name_te", "title_te", "summary_te", "body_te", "text"] as const;

export default async function TranslationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const { staff, supabase } = await requireConsole(locale);
  const t = await getTranslations("Admin");
  const codes = await takeFormError();
  const queue = await loadRows<StageRow>(
    supabase,
    "v_editor_translation_stage",
    "id, kind, entity_key, field, english_text, telugu, created_by",
  );
  const canStage = staff.role === "editor" || staff.role === "admin";

  return (
    <>
      <h2>{t("translationsPageTitle")}</h2>
      <p>{t("translationsIntro")}</p>
      <p>{t("translationsNoFile")}</p>
      <p>
        <a href={`/${locale}/admin/translations/worklist`}>{t("translationsWorklist")}</a>
      </p>
      <FormAlerts codes={codes} saved={query.saved === "1" && codes.length === 0} />
      {canStage ? <TranslationUpload locale={locale} /> : null}
      {canStage ? (
        <form action={stageTranslation}>
          <h3>{t("stageTitle")}</h3>
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor="translation-kind">
            {t("kind")}
            <select id="translation-kind" name="kind" required>
              {kinds.map((kind) => (
                <option key={kind} value={kind}>
                  {t(kindLabel(kind))}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="translation-key">
            {t("fieldKey")}
            <input id="translation-key" name="key" required />
          </label>
          <label htmlFor="translation-field">
            {t("fieldName")}
            <select id="translation-field" name="field" required>
              {fields.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="translation-telugu">
            {t("teluguText")}
            <textarea id="translation-telugu" name="telugu" required />
          </label>
          <label htmlFor="translation-reason">
            {t("reason")}
            <input id="translation-reason" name="reason" required />
          </label>
          <button className="ink-button" type="submit">
            {t("stageTranslation")}
          </button>
        </form>
      ) : null}
      {!queue.ok ? <p className="empty">{t("readFailed")}</p> : null}
      {queue.ok && queue.rows.length === 0 ? <p className="empty">{t("emptyTranslations")}</p> : null}
      {queue.ok
        ? queue.rows.map((row) => {
            const own = row.created_by === staff.user_id;
            return (
              <article key={row.id} className="queue">
                <h3>
                  {row.kind} · {row.entity_key} · {row.field}
                </h3>
                <p>{snippet(row.english_text || row.entity_key)}</p>
                <p lang="te">{snippet(row.telugu)}</p>
                {own ? <p>{t("ownTranslation")}</p> : (
                  <form action={approveTranslation}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="stageId" value={row.id} />
                    <label htmlFor={`approve-${row.id}`}>
                      {t("reason")}
                      <input id={`approve-${row.id}`} name="reason" required />
                    </label>
                    <button className="ink-button" type="submit">
                      {t("approveTranslation")}
                    </button>
                  </form>
                )}
              </article>
            );
          })
        : null}
    </>
  );
}

function kindLabel(kind: (typeof kinds)[number]) {
  if (kind === "person") return "kindPerson";
  if (kind === "case") return "kindCase";
  if (kind === "promise") return "kindPromise";
  return "kindMessage";
}
