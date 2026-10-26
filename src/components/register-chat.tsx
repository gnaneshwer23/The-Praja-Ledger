"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { askRegister } from "@/lib/chat/ask";
import type { ChatState } from "@/lib/chat/answer";

const idle: ChatState = { status: "idle", passages: [] };

export function RegisterChat() {
  const t = useTranslations("Chat");
  const [state, action, pending] = useActionState(askRegister, idle);

  return (
    <form className="ask-form" action={action}>
      <label htmlFor="register-question">{t("label")}</label>
      <textarea
        id="register-question"
        name="question"
        rows={4}
        required
        placeholder={t("placeholder")}
      />
      <button className="ink-button" type="submit">
        {pending ? t("pending") : t("submit")}
      </button>
      {state.status === "empty" ? <p role="status">{t("empty")}</p> : null}
      {state.status === "missing" ? <p role="status">{t("missing")}</p> : null}
      {state.status === "cited" ? (
        <div role="status">
          <p>{t("drawn")}</p>
          <p>{t("cited")}</p>
          <ol className="register-cites">
            {state.passages.map((passage) => (
              <li key={`${passage.id}:${passage.href}`} className="register-cite">
                <p>
                  <strong>{passage.id}</strong>
                </p>
                <blockquote>{passage.text}</blockquote>
                <p className="quiet">{t("quoteNote")}</p>
                <p>
                  <Link href={passage.href}>{t("open")}</Link>
                  {passage.sourceTitle ? (
                    <>
                      {" · "}
                      {t("source")}
                      {": "}
                      {passage.sourceUrl ? (
                        <a href={passage.sourceUrl} rel="noreferrer">
                          {passage.sourceTitle}
                        </a>
                      ) : (
                        passage.sourceTitle
                      )}
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </form>
  );
}
