import { getTranslations } from "next-intl/server";
import { requireConsole } from "@/lib/auth/console";
import { formatLedgerDate, snippet } from "@/lib/admin/format";
import { loadRows } from "@/lib/data/editor";

type Draft = {
  id: string;
  kind: string;
  body: string;
  created_at: string;
  status: string;
  created_by: string;
};
type Review = { id: string; target: string; subject: string; after_text: string };
type Stale = { id: string; slug: string; title: string; last_at: string | null };
type Silence = {
  id: string;
  constituency_ids: string[];
  starts_at: string;
  ends_at: string;
  note: string | null;
  live: boolean;
};

export const instant = false;

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { staff, supabase } = await requireConsole(locale);
  const t = await getTranslations("Admin");
  const [drafts, review, corrections, stale, silence] = await Promise.all([
    loadRows<Draft>(
      supabase,
      "v_editor_entries",
      "id, kind, body, created_at, status, created_by",
    ),
    loadRows<Review>(supabase, "v_editor_review", "id, target, subject, after_text"),
    supabase.from("v_editor_open_corrections").select("open_count").maybeSingle(),
    loadRows<Stale>(supabase, "v_editor_stale_cases", "id, slug, title, last_at"),
    loadRows<Silence>(
      supabase,
      "v_editor_silence",
      "id, constituency_ids, starts_at, ends_at, note, live",
    ),
  ]);
  const myDrafts = drafts.ok
    ? drafts.rows.filter((row) => row.status === "draft" && row.created_by === staff.user_id)
    : [];
  const liveWindows = silence.ok ? silence.rows.filter((row) => row.live) : [];
  const openCount =
    corrections.data && typeof corrections.data === "object" && "open_count" in corrections.data
      ? Number((corrections.data as { open_count: number }).open_count)
      : null;
  const failed = !drafts.ok || !stale.ok || !silence.ok || corrections.error;

  return (
    <>
      <p>{t("signedInAs", { name: staff.display_name })}</p>
      {failed ? <p className="empty">{t("readFailed")}</p> : null}
      <h2>{t("draftsTitle")}</h2>
      {myDrafts.length === 0 ? <p className="empty">{t("emptyDrafts")}</p> : null}
      <ul>
        {myDrafts.map((row) => (
          <li key={row.id}>
            {row.kind === "issue" ? t("kindIssue") : t("kindWork")} · {snippet(row.body)}
          </li>
        ))}
      </ul>
      {staff.role === "editor" ? null : (
        <>
          <h2>{t("reviewTitle")}</h2>
          {!review.ok || review.rows.length === 0 ? <p className="empty">{t("emptyReview")}</p> : null}
          <ul>
            {review.ok
              ? review.rows.map((row) => (
                  <li key={`${row.target}-${row.id}`}>
                    {row.subject}: {snippet(row.after_text)}
                  </li>
                ))
              : null}
          </ul>
        </>
      )}
      <h2>{t("correctionsTitle")}</h2>
      <p>{openCount === null ? t("readFailed") : t("correctionsCount", { count: openCount })}</p>
      <h2>{t("staleTitle")}</h2>
      {stale.ok && stale.rows.length === 0 ? <p className="empty">{t("emptyStale")}</p> : null}
      <ul>
        {stale.ok
          ? stale.rows.map((row) => (
              <li key={row.id}>
                {row.title} · {row.last_at ? formatLedgerDate(row.last_at) : t("notChecked")}
              </li>
            ))
          : null}
      </ul>
      <h2>{t("silenceTitle")}</h2>
      {liveWindows.length === 0 ? <p className="empty">{t("emptySilence")}</p> : null}
      <ul>
        {liveWindows.map((row) => (
          <li key={row.id}>
            {row.constituency_ids.join(", ")} · {formatLedgerDate(row.starts_at)} – {formatLedgerDate(row.ends_at)}
            {row.note ? ` · ${row.note}` : ""}
          </li>
        ))}
      </ul>
    </>
  );
}
