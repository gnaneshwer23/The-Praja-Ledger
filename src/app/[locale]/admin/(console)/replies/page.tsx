import { getTranslations } from "next-intl/server";
import { FormAlerts } from "@/components/admin/form-alerts";
import { publishReply } from "@/lib/actions/corrections";
import { takeFormError } from "@/lib/actions/editorial";
import { formatLedgerDate } from "@/lib/admin/format";
import { requireConsole } from "@/lib/auth/console";
import { loadRows } from "@/lib/data/editor";

type ReplyRow = {
  id: string;
  external_id: string | null;
  title: string | null;
  office_name: string;
  body: string;
  created_at: string;
  has_office_email: boolean;
  office_domain: string | null;
};

export const instant = false;

export default async function RepliesPage({
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
  const queue = await loadRows<ReplyRow>(
    supabase,
    "v_editor_replies",
    "id, external_id, title, office_name, body, created_at, has_office_email, office_domain",
  );

  return (
    <>
      <h2>{t("repliesPageTitle")}</h2>
      <p className="quiet">{t("repliesIntro")}</p>
      <FormAlerts codes={codes} saved={query.saved === "1" && codes.length === 0} />
      {!queue.ok ? <p className="empty">{t("readFailed")}</p> : null}
      {queue.ok && queue.rows.length === 0 ? <p className="empty">{t("emptyReplies")}</p> : null}
      {queue.ok
        ? queue.rows.map((row) => (
            <article key={row.id} className="queue">
              <h3>
                {row.office_name}
                {row.external_id ? ` · ${row.external_id}` : ""}
              </h3>
              <p>{row.title ? `${row.title} · ` : ""}{formatLedgerDate(row.created_at)}</p>
              <p>{row.body}</p>
              <p>
                {row.has_office_email ? t("hasOfficeEmail") : t("noOfficeEmail")}
                {row.office_domain ? ` · ${row.office_domain}` : ""}
              </p>
              <form action={publishReply}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={row.id} />
                <label htmlFor={`method-${row.id}`}>
                  {t("verifyMethod")}
                  <select id={`method-${row.id}`} name="method" defaultValue="email_domain">
                    <option value="email_domain">{t("verifyEmail")}</option>
                    <option value="signed_letter">{t("verifyLetter")}</option>
                  </select>
                </label>
                <label htmlFor={`letter-${row.id}`}>
                  {t("letter")}
                  <input id={`letter-${row.id}`} name="letter" type="file" accept="application/pdf,image/png,image/jpeg" />
                </label>
                <label htmlFor={`reason-${row.id}`}>
                  {t("reason")}
                  <input id={`reason-${row.id}`} name="reason" required />
                </label>
                <button className="ink-button" type="submit">
                  {t("publishReply")}
                </button>
              </form>
            </article>
          ))
        : null}
    </>
  );
}
