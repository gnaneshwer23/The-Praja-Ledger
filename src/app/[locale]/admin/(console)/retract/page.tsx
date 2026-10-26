import { getTranslations } from "next-intl/server";
import { FormAlerts } from "@/components/admin/form-alerts";
import { retractEntry, takeFormError } from "@/lib/actions/editorial";
import { snippet } from "@/lib/admin/format";
import { requireConsole } from "@/lib/auth/console";
import { loadRows } from "@/lib/data/editor";

type Entry = { id: string; person_name: string; body: string; status: string };

export const instant = false;

export default async function RetractPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const { supabase } = await requireConsole(locale);
  const t = await getTranslations("Admin");
  const codes = await takeFormError();
  const entries = await loadRows<Entry>(
    supabase,
    "v_editor_entries",
    "id, person_name, body, status",
  );
  const published = entries.ok ? entries.rows.filter((row) => row.status === "published") : [];

  return (
    <>
      <h2>{t("retractTitle")}</h2>
      <p>{t("retractIntro")}</p>
      <FormAlerts codes={codes} saved={query.saved === "1" && codes.length === 0} />
      {!entries.ok ? <p className="empty">{t("readFailed")}</p> : null}
      {entries.ok && published.length === 0 ? <p className="empty">{t("emptyEntries")}</p> : null}
      <form action={retractEntry}>
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="entryId">
          {t("entry")}
          <select id="entryId" name="entryId" required>
            <option value="">{t("entry")}</option>
            {published.map((row) => (
              <option key={row.id} value={row.id}>
                {row.person_name}: {snippet(row.body, 80)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="reason">
          {t("reason")}
          <input id="reason" name="reason" required />
        </label>
        <button className="ink-button" type="submit">
          {t("retract")}
        </button>
      </form>
    </>
  );
}
