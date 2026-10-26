import { getTranslations } from "next-intl/server";

const errorKeys = new Set([
  "email",
  "code",
  "not_configured",
  "link_failed",
  "link_first",
  "already",
  "reason",
  "source",
  "tier1_url",
  "url",
  "wording",
  "body",
  "archive",
  "archive_not_configured",
  "forbidden",
  "silence",
  "self",
  "save_failed",
  "date",
  "staff_user",
  "own_role",
  "own_remove",
  "personal",
  "name",
  "person",
  "case",
  "stage",
  "promise",
  "status",
  "entry",
  "role",
  "party",
  "seat",
  "rate",
  "queue",
  "record",
  "change",
  "domain",
  "letter",
  "unedited",
  "not_configured",
  "telugu",
  "staged",
]);

export async function FormAlerts({ codes, saved }: { codes: string[]; saved: boolean }) {
  const t = await getTranslations("Admin");
  return (
    <>
      {saved ? <p role="status">{t("saved")}</p> : null}
      {codes.length > 0 ? (
        <div role="alert">
          {codes.map((code) => (
            <p key={code}>{errorKeys.has(code) ? t(`errors.${code}`) : t("errors.save_failed")}</p>
          ))}
        </div>
      ) : null}
    </>
  );
}
