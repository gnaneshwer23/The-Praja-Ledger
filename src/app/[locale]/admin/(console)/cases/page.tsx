import { getTranslations } from "next-intl/server";
import { FormAlerts } from "@/components/admin/form-alerts";
import { saveCaseEvent, takeFormError } from "@/lib/actions/editorial";
import { requireConsole } from "@/lib/auth/console";
import { loadRows } from "@/lib/data/editor";

type CaseRow = { id: string; title: string };
type Stage = { case_id: string; idx: number; label: string };
type Source = { id: string; type: string; title: string | null };

export const instant = false;

export default async function CasesPage({
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

  const [cases, stages, sources] = await Promise.all([
    loadRows<CaseRow>(supabase, "v_editor_cases", "id, title"),
    loadRows<Stage>(supabase, "v_case_stages", "case_id, idx, label"),
    loadRows<Source>(supabase, "v_editor_sources", "id, type, title"),
  ]);
  const titles = new Map(cases.rows.map((row) => [row.id, row.title]));
  const options = stages.rows.filter((stage) => titles.has(stage.case_id));

  return (
    <>
      <h2>{t("casesTitle")}</h2>
      <p>{t("casesIntro")}</p>
      <FormAlerts codes={codes} saved={query.saved === "1" && codes.length === 0} />
      {!cases.ok || !stages.ok || !sources.ok ? <p className="empty">{t("readFailed")}</p> : null}
      {options.length === 0 ? <p className="empty">{t("emptyCases")}</p> : null}
      <form action={saveCaseEvent}>
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="stage">
          {t("stage")}
          <select id="stage" name="stage" required>
            <option value="">{t("stage")}</option>
            {options.map((stage) => (
              <option key={`${stage.case_id}-${stage.idx}`} value={`${stage.case_id}|${stage.idx}`}>
                {titles.get(stage.case_id)} · {stage.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="eventDate">
          {t("eventDate")}
          <input id="eventDate" name="eventDate" placeholder="2026-10-25" required />
        </label>
        <label htmlFor="note">
          {t("note")}
          <textarea id="note" name="note" required />
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
