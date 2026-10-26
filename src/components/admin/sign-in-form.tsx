"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { prepareTotp, requestMagicLink, verifyTotp, type AuthState } from "@/lib/actions/auth";

const initial: AuthState = { error: "", ok: false, qr: "", secret: "", factorId: "" };

const notices = new Set([
  "unconfigured",
  "signed_out",
  "mfa_required",
  "session_expired",
  "staff",
  "unavailable",
  "link_failed",
]);

export function SignInForm({
  locale,
  configured,
  notice,
}: {
  locale: string;
  configured: boolean;
  notice: string;
}) {
  const t = useTranslations("Admin");
  const [linkState, linkAction, linkPending] = useActionState(requestMagicLink, initial);
  const [setupState, setupAction, setupPending] = useActionState(prepareTotp, initial);
  const [codeState, codeAction, codePending] = useActionState(verifyTotp, initial);
  const qr = setupState.qr.startsWith("data:image/") ? setupState.qr : "";

  return (
    <div className="admin-signin">
      {configured ? null : <p role="status">{t("notConfigured")}</p>}
      {notices.has(notice) ? <p role="status">{t(`notices.${notice}`)}</p> : null}

      <form action={linkAction}>
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="email">
          {t("email")}
          <input id="email" name="email" type="email" autoComplete="email" />
        </label>
        <button className="ink-button" type="submit" disabled={linkPending}>
          {t("sendLink")}
        </button>
        {linkState.error ? <p role="alert">{t(`errors.${linkState.error}`)}</p> : null}
        {linkState.ok ? <p role="status">{t("linkSent")}</p> : null}
      </form>

      <form action={setupAction}>
        <input type="hidden" name="locale" value={locale} />
        <button className="text-button" type="submit" disabled={setupPending}>
          {t("setup")}
        </button>
        {setupState.error ? <p role="alert">{t(`errors.${setupState.error}`)}</p> : null}
        {qr ? <img src={qr} alt={t("qrAlt")} width={180} height={180} /> : null}
        {setupState.secret ? (
          <p>
            {t("secretLabel")} <code>{setupState.secret}</code>
          </p>
        ) : null}
      </form>

      <form action={codeAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="factorId" value={setupState.factorId} />
        <label htmlFor="code">
          {t("code")}
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
          />
        </label>
        <button className="ink-button" type="submit" disabled={codePending}>
          {t("checkCode")}
        </button>
        {codeState.error ? <p role="alert">{t(`errors.${codeState.error}`)}</p> : null}
      </form>
    </div>
  );
}
