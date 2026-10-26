import { getTranslations } from "next-intl/server";
import { FormAlerts } from "@/components/admin/form-alerts";
import { savePromiseUpdate, takeFormError } from "@/lib/actions/editorial";
import { requireConsole } from "@/lib/auth/console";
import { snippet } from "@/lib/admin/format";
import { loadRows } from "@/lib/data/editor";
import { promiseStatuses } from "@/lib/schemas/editorial";

type PromiseRow = { id: string; title: string | null; body: string };
type Source = { id: string; type: string; title: string | null };

export const instant = false;

export default async function PromisesPage({
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
  const [promises, sources] = await Promise.all([
    loadRows<PromiseRow>(supabase, "v_promises", "id, title, body"),
    loadRows<Source>(supabase, "v_editor_sources", "id, type, title"),
  ]);

  return (
    <>
      <h2>{t("promisesTitle")}</h2>
      <FormAlerts codes={codes} saved={query.saved === "1" && codes.length === 0} />
      {!promises.ok || !sources.ok ? <p className="empty">{t("readFailed")}</p> : null}
      {promises.ok && promises.rows.length === 0 ? <p className="empty">{t("emptyPromises")}</p> : null}
      <form action={savePromiseUpdate}>
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="promiseId">
          {t("promise")}
          <select id="promiseId" name="promiseId" required>
            <option value="">{t("promise")}</option>
            {promises.rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title || snippet(row.body, 80)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="status">
          {t("status")}
          <select id="status" name="status" defaultValue="unverified">
            {promiseStatuses.map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="detail">
          {t("detail")} ({t("optional")})
          <textarea id="detail" name="detail" />
        </label>
        <label htmlFor="sourceId">
          {t("source")}
          <select id="sourceId" name="sourceId" required>
            <option value="">{t("source")}</option>
            {sources.rows.map((source) => (
              <option key={source.id} value={source.id}>
                {t(`sourceTypes.${source.type}`)} · {source.title || source.type}
              </option>
            ))}
          </select>
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
