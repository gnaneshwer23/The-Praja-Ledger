import { getTranslations } from "next-intl/server";
import { FormAlerts } from "@/components/admin/form-alerts";
import { saveEntry, takeFormError } from "@/lib/actions/editorial";
import { requireConsole } from "@/lib/auth/console";
import { loadRows } from "@/lib/data/editor";
import { sourceTypes } from "@/lib/schemas/editorial";

type Person = { id: string; name: string };
type Source = { id: string; type: string; title: string | null };

export const instant = false;

export default async function EntriesPage({
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
  if (staff.role === "reviewer") return <p>{t("forbidden")}</p>;

  const [people, sources] = await Promise.all([
    loadRows<Person>(supabase, "v_people", "id, name"),
    loadRows<Source>(supabase, "v_editor_sources", "id, type, title"),
  ]);

  return (
    <>
      <h2>{t("entriesTitle")}</h2>
      <FormAlerts codes={codes} saved={query.saved === "1" && codes.length === 0} />
      {!people.ok || !sources.ok ? <p className="empty">{t("readFailed")}</p> : null}
      <form action={saveEntry}>
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="personId">
          {t("person")}
          <select id="personId" name="personId" required>
            <option value="">{t("person")}</option>
            {people.rows.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        {people.rows.length === 0 ? <p className="empty">{t("emptyPeople")}</p> : null}
        <label htmlFor="kind">
          {t("kind")}
          <select id="kind" name="kind" defaultValue="work">
            <option value="work">{t("kindWork")}</option>
            <option value="issue">{t("kindIssue")}</option>
          </select>
        </label>
        <label htmlFor="body">
          {t("body")}
          <textarea id="body" name="body" required />
        </label>
        <label htmlFor="bodyTe">
          {t("bodyTe")} ({t("optional")})
          <textarea id="bodyTe" name="bodyTe" />
        </label>
        <fieldset>
          <legend>{t("sourceMode")}</legend>
          <label>
            <input type="radio" name="sourceMode" value="existing" defaultChecked /> {t("sourceExisting")}
          </label>
          <label>
            <input type="radio" name="sourceMode" value="new" /> {t("sourceNew")}
          </label>
        </fieldset>
        <label htmlFor="sourceId">
          {t("sourceExisting")}
          <select id="sourceId" name="sourceId">
            <option value="">{t("source")}</option>
            {sources.rows.map((source) => (
              <option key={source.id} value={source.id}>
                {t(`sourceTypes.${source.type}`)} · {source.title || source.type}
              </option>
            ))}
          </select>
        </label>
        {sources.rows.length === 0 ? <p className="empty">{t("emptySources")}</p> : null}
        <label htmlFor="sourceType">
          {t("sourceType")}
          <select id="sourceType" name="sourceType" defaultValue="MEDIA">
            {sourceTypes.map((type) => (
              <option key={type} value={type}>
                {t(`sourceTypes.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="url">
          {t("url")}
          <input id="url" name="url" type="url" />
        </label>
        <label htmlFor="title">
          {t("sourceTitle")}
          <input id="title" name="title" />
        </label>
        <label htmlFor="publisher">
          {t("publisher")}
          <input id="publisher" name="publisher" />
        </label>
        <label htmlFor="publishedOn">
          {t("publishedOn")}
          <input id="publishedOn" name="publishedOn" placeholder="2026-10-25" />
        </label>
        <label htmlFor="reason">
          {t("reason")}
          <input id="reason" name="reason" required />
        </label>
        <button className="ink-button" type="submit">
          {t("save")}
        </button>
      </form>
    </>
  );
}
