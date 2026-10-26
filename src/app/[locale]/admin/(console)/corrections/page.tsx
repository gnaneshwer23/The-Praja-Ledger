import { getTranslations } from "next-intl/server";
import { FormAlerts } from "@/components/admin/form-alerts";
import { applyCorrection, declineCorrection, purgeCorrectionEmails } from "@/lib/actions/corrections";
import { takeFormError } from "@/lib/actions/editorial";
import { formatLedgerDate, snippet } from "@/lib/admin/format";
import { requireConsole } from "@/lib/auth/console";
import { loadRows } from "@/lib/data/editor";

type CorrectionRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  source_url: string | null;
  created_at: string;
};
type ChangeRow = {
  id: number;
  at: string;
  actor_name: string | null;
  table_name: string;
  action: string;
  reason: string;
};

export const instant = false;

export default async function CorrectionsTriagePage({
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
  if (staff.role === "editor") return <p>{t("forbidden")}</p>;

  const [queue, changes] = await Promise.all([
    loadRows<CorrectionRow>(
      supabase,
      "v_editor_corrections",
      "id, entity_type, entity_id, body, source_url, created_at",
    ),
    loadRows<ChangeRow>(supabase, "v_editor_changes", "id, at, actor_name, table_name, action, reason"),
  ]);

  return (
    <>
      <h2>{t("correctionsPageTitle")}</h2>
      <FormAlerts codes={codes} saved={query.saved === "1" && codes.length === 0} />
      {!queue.ok || !changes.ok ? <p className="empty">{t("readFailed")}</p> : null}
      {queue.ok && queue.rows.length === 0 ? <p className="empty">{t("emptyCorrections")}</p> : null}
      <h3>{t("recentChanges")}</h3>
      {changes.ok && changes.rows.length === 0 ? <p className="empty">{t("emptyChanges")}</p> : null}
      <ul>
        {changes.ok
          ? changes.rows.map((row) => (
              <li key={row.id}>
                {row.id} · {formatLedgerDate(row.at)} · {row.actor_name ?? t("notChecked")} · {snippet(row.reason)}
              </li>
            ))
          : null}
      </ul>
      {queue.ok
        ? queue.rows.map((row) => (
            <article key={row.id} className="queue">
              <h3>
                {row.entity_type} · {formatLedgerDate(row.created_at)}
              </h3>
              <p>{row.body}</p>
              {row.source_url ? (
                <p>
                  <a href={row.source_url}>{row.source_url}</a>
                </p>
              ) : null}
              <form action={applyCorrection}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={row.id} />
                <label htmlFor={`change-${row.id}`}>
                  {t("changeId")}
                  <input id={`change-${row.id}`} name="auditId" inputMode="numeric" required />
                </label>
                <label htmlFor={`apply-note-${row.id}`}>
                  {t("decisionNote")}
                  <input id={`apply-note-${row.id}`} name="note" required />
                </label>
                <button className="ink-button" type="submit">
                  {t("applyCorrection")}
                </button>
              </form>
              <form action={declineCorrection}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={row.id} />
                <label htmlFor={`decline-note-${row.id}`}>
                  {t("decisionNote")}
                  <input id={`decline-note-${row.id}`} name="note" required />
                </label>
                <button className="text-button" type="submit">
                  {t("declineCorrection")}
                </button>
              </form>
            </article>
          ))
        : null}
      {staff.role === "admin" ? (
        <>
          <h3>{t("purgeEmails")}</h3>
          <p className="quiet">{t("purgeNote")}</p>
          <form action={purgeCorrectionEmails}>
            <input type="hidden" name="locale" value={locale} />
            <label htmlFor="purge-reason">
              {t("reason")}
              <input id="purge-reason" name="reason" required />
            </label>
            <button className="text-button" type="submit">
              {t("purgeEmails")}
            </button>
          </form>
        </>
      ) : null}
    </>
  );
}
