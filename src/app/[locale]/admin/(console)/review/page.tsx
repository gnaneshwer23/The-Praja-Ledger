import { getTranslations } from "next-intl/server";
import { FormAlerts } from "@/components/admin/form-alerts";
import { approveItem, sendBackItem, takeFormError } from "@/lib/actions/editorial";
import { requireConsole } from "@/lib/auth/console";
import { loadRows } from "@/lib/data/editor";
import { reviewSides } from "@/lib/schemas/editorial";

type ReviewRow = {
  target: "entry" | "case_event";
  id: string;
  subject: string;
  after_text: string;
  before_text: string | null;
  case_id: string | null;
};

export const instant = false;

export default async function ReviewPage({
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
  const queue = await loadRows<ReviewRow>(
    supabase,
    "v_editor_review",
    "target, id, subject, after_text, before_text, case_id",
  );

  return (
    <>
      <h2>{t("reviewPageTitle")}</h2>
      <FormAlerts codes={codes} saved={query.saved === "1" && codes.length === 0} />
      {!queue.ok ? <p className="empty">{t("readFailed")}</p> : null}
      {queue.ok && queue.rows.length === 0 ? <p className="empty">{t("emptyReview")}</p> : null}
      {queue.ok
        ? queue.rows.map((row) => {
            const sides = reviewSides(row.before_text, row.after_text);
            return (
              <article key={`${row.target}-${row.id}`} className="queue">
                <h3>{row.subject}</h3>
                <div className="diff">
                  <div>
                    <h4>{t("before")}</h4>
                    <p>{sides.before ?? t("noEarlier")}</p>
                  </div>
                  <div>
                    <h4>{t("after")}</h4>
                    <p>{sides.after}</p>
                  </div>
                </div>
                <form action={approveItem}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="target" value={row.target} />
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="caseId" value={row.case_id ?? ""} />
                  <label htmlFor={`approve-${row.id}`}>
                    {t("reason")}
                    <input id={`approve-${row.id}`} name="reason" required />
                  </label>
                  <button className="ink-button" type="submit">
                    {t("approve")}
                  </button>
                </form>
                <form action={sendBackItem}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="target" value={row.target} />
                  <input type="hidden" name="id" value={row.id} />
                  <label htmlFor={`back-${row.id}`}>
                    {t("note")}
                    <input id={`back-${row.id}`} name="reason" required />
                  </label>
                  <button className="text-button" type="submit">
                    {t("sendBack")}
                  </button>
                </form>
              </article>
            );
          })
        : null}
    </>
  );
}
