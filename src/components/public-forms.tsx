import { getTranslations } from "next-intl/server";
import { turnstileSiteKey } from "@/lib/public/guards";

const notices = new Set([
  "sent",
  "reply_sent",
  "captcha",
  "not_configured",
  "rate",
  "queue",
  "record",
  "url",
  "email",
  "body",
  "personal",
  "office",
  "save_failed",
]);

export async function CorrectionNotice({ notice }: { notice?: string }) {
  const t = await getTranslations("CorrectionsPage");
  if (!notice || !notices.has(notice)) return null;
  const success = notice === "sent" || notice === "reply_sent";
  return <p role={success ? "status" : "alert"}>{t(`notices.${notice}`)}</p>;
}

function Turnstile({ siteKey }: { siteKey: string | null }) {
  if (!siteKey) return null;
  return <div className="cf-turnstile" data-sitekey={siteKey} />;
}

export async function CorrectionForm({
  locale,
  entityType,
  publicId,
  idPrefix,
  compact = false,
}: {
  locale: string;
  entityType?: "entry" | "case" | "promise";
  publicId?: string;
  idPrefix: string;
  compact?: boolean;
}) {
  const t = await getTranslations("CorrectionsPage");
  const siteKey = turnstileSiteKey();
  const locked = Boolean(entityType && publicId);
  const form = (
    <form className="public-form" action="/api/corrections" method="post">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnTo" value={`/${locale}/corrections`} />
      {locked ? <input type="hidden" name="entityType" value={entityType} /> : null}
      {locked ? <input type="hidden" name="publicId" value={publicId} /> : null}
      {locked ? null : (
        <>
          <label htmlFor={`${idPrefix}-type`}>
            {t("recordType")}
            <select id={`${idPrefix}-type`} name="entityType" defaultValue="entry">
              <option value="entry">{t("typeEntry")}</option>
              <option value="case">{t("typeCase")}</option>
              <option value="promise">{t("typePromise")}</option>
            </select>
          </label>
          <label htmlFor={`${idPrefix}-id`}>
            {t("recordId")}
            <input id={`${idPrefix}-id`} name="publicId" required />
          </label>
        </>
      )}
      <label htmlFor={`${idPrefix}-body`}>
        {t("whatsWrong")}
        <textarea id={`${idPrefix}-body`} name="body" required maxLength={4000} />
      </label>
      <label htmlFor={`${idPrefix}-url`}>
        {t("sourceLink")}
        <input id={`${idPrefix}-url`} name="sourceUrl" type="url" inputMode="url" />
      </label>
      <label htmlFor={`${idPrefix}-email`}>
        {t("email")}
        <input id={`${idPrefix}-email`} name="contactEmail" type="email" autoComplete="off" />
      </label>
      <p className="quiet">{t("emailNote")}</p>
      {siteKey ? null : <p className="empty">{t("notConfigured")}</p>}
      <Turnstile siteKey={siteKey} />
      <button className="ink-button" type="submit">
        {t("submit")}
      </button>
    </form>
  );
  if (!compact) return form;
  return (
    <details className="public-fold">
      <summary>{t("formTitle")}</summary>
      {form}
    </details>
  );
}

export async function ReplyForm({
  locale,
  publicId,
  idPrefix,
}: {
  locale: string;
  publicId: string;
  idPrefix: string;
}) {
  const t = await getTranslations("CorrectionsPage");
  const siteKey = turnstileSiteKey();
  return (
    <details className="public-fold">
      <summary>{t("replyTitle")}</summary>
      <form className="public-form" action="/api/replies" method="post">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="returnTo" value={`/${locale}/corrections`} />
        <input type="hidden" name="publicId" value={publicId} />
        <label htmlFor={`${idPrefix}-office`}>
          {t("replyOffice")}
          <input id={`${idPrefix}-office`} name="officeName" required maxLength={200} />
        </label>
        <label htmlFor={`${idPrefix}-reply`}>
          {t("replyBody")}
          <textarea id={`${idPrefix}-reply`} name="body" required maxLength={4000} />
        </label>
        <label htmlFor={`${idPrefix}-office-email`}>
          {t("replyEmail")}
          <input id={`${idPrefix}-office-email`} name="officeEmail" type="email" autoComplete="off" />
        </label>
        <p className="quiet">{t("replyEmailNote")}</p>
        {siteKey ? null : <p className="empty">{t("notConfigured")}</p>}
        <Turnstile siteKey={siteKey} />
        <button className="ink-button" type="submit">
          {t("replySubmit")}
        </button>
      </form>
    </details>
  );
}
