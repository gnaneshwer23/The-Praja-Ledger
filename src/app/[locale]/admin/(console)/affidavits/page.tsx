import { getTranslations } from "next-intl/server";
import { FormAlerts } from "@/components/admin/form-alerts";
import { confirmAffidavit, takeFormError } from "@/lib/actions/editorial";
import { requireConsole } from "@/lib/auth/console";
import { loadRows } from "@/lib/data/editor";

type StageRow = {
  id: string;
  constituency_id: string;
  person_name: string;
  party_name: string | null;
  election: string;
  year: number;
  assets_inr: number | string | null;
  liabilities_inr: number | string | null;
  declared_cases: number | string | null;
  serious_cases: number | string | null;
  source_url: string;
  page_number: number;
  created_by: string;
};

export const instant = false;

function figure(value: number | string | null) {
  if (value == null || value === "") return null;
  return String(value);
}

export default async function AffidavitsPage({
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
  const profile = await getTranslations("Profile");
  const codes = await takeFormError();
  const queue = await loadRows<StageRow>(
    supabase,
    "v_editor_affidavit_stage",
    "id, constituency_id, person_name, party_name, election, year, assets_inr, liabilities_inr, declared_cases, serious_cases, source_url, page_number, created_by",
  );

  return (
    <>
      <h2>{t("affidavitsPageTitle")}</h2>
      <p>{t("affidavitsIntro")}</p>
      <FormAlerts codes={codes} saved={query.saved === "1" && codes.length === 0} />
      {!queue.ok ? <p className="empty">{t("readFailed")}</p> : null}
      {queue.ok && queue.rows.length === 0 ? <p className="empty">{t("emptyAffidavits")}</p> : null}
      {queue.ok
        ? queue.rows.map((row) => {
            const own = row.created_by === staff.user_id;
            return (
              <article key={row.id} className="queue">
                <h3>
                  {row.person_name}, {row.constituency_id}
                </h3>
                <p>
                  {row.election} {row.year}
                </p>
                <p>{t("partyOnAffidavit")}</p>
                <p>{row.party_name ?? profile("missing")}</p>
                <p>
                  {figure(row.assets_inr) ?? profile("missing")}
                  {" · "}
                  {figure(row.liabilities_inr) ?? profile("missing")}
                  {" · "}
                  {figure(row.declared_cases) ?? profile("missing")}
                  {" · "}
                  {figure(row.serious_cases) ?? profile("missing")}
                  {" · "}
                  {row.page_number}
                </p>
                <p>
                  <a href={row.source_url} rel="noreferrer">
                    {row.source_url}
                  </a>
                </p>
                {own ? <p>{t("ownAffidavit")}</p> : (
                  <form action={confirmAffidavit}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="stageId" value={row.id} />
                    <label htmlFor={`confirm-${row.id}`}>
                      {t("reason")}
                      <input id={`confirm-${row.id}`} name="reason" required />
                    </label>
                    <button className="ink-button" type="submit">
                      {t("confirmAffidavit")}
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
