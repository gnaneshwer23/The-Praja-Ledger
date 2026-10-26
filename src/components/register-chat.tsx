"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { askRegister } from "@/lib/chat/ask";
import { idleChatState, type ChatTurn, type CitedPassage } from "@/lib/chat/answer";

export function RegisterChat() {
  const t = useTranslations("Chat");
  const [state, action, pending] = useActionState(askRegister, idleChatState);
  const [sending, setSending] = useState("");

  return (
    <form
      className="register-chat"
      action={async (formData) => {
        setSending(String(formData.get("question") ?? "").trim());
        await action(formData);
      }}
    >
      <div className="register-thread" aria-live="polite">
        {state.turns.length === 0 && !pending ? (
          <article className="register-bubble is-register">
            <p className="register-who">{t("register")}</p>
            <p>{t("prompt")}</p>
          </article>
        ) : null}
        {state.turns.map((turn, index) => (
          <Turn key={`${index}:${turn.question}`} turn={turn} />
        ))}
        {pending && sending ? (
          <>
            <article className="register-bubble is-you">
              <p className="register-who">{t("you")}</p>
              <p>{sending}</p>
            </article>
            <article className="register-bubble is-register" aria-busy="true">
              <p className="register-who">{t("register")}</p>
              <p>{t("pending")}</p>
            </article>
          </>
        ) : null}
      </div>
      <div className="register-composer">
        <label htmlFor="register-question">{t("label")}</label>
        <textarea
          id="register-question"
          name="question"
          rows={2}
          required
          placeholder={t("placeholder")}
        />
        <button className="ink-button" type="submit" disabled={pending}>
          {t("submit")}
        </button>
      </div>
    </form>
  );
}

function Turn({ turn }: { turn: ChatTurn }) {
  const t = useTranslations("Chat");

  return (
    <>
      {turn.question ? (
        <article className="register-bubble is-you">
          <p className="register-who">{t("you")}</p>
          <p>{turn.question}</p>
        </article>
      ) : null}
      <article className="register-bubble is-register">
        <p className="register-who">{t("register")}</p>
        {turn.status === "empty" ? <p>{t("empty")}</p> : null}
        {turn.status === "missing" ? <p>{t("missing")}</p> : null}
        {turn.status === "cited" ? (
          <>
            <p>{t("drawn")}</p>
            <p>{t("cited")}</p>
            <ol className="register-cites">
              {turn.passages.map((passage) => (
                <Citation key={`${passage.id}:${passage.href}`} passage={passage} />
              ))}
            </ol>
          </>
        ) : null}
      </article>
    </>
  );
}

function Citation({ passage }: { passage: CitedPassage }) {
  const t = useTranslations("Chat");

  return (
    <li className="register-cite">
      <p>
        <strong>{passage.id}</strong>
      </p>
      <blockquote>{passage.text}</blockquote>
      <p className="register-meta">{t("quoteNote")}</p>
      <p>
        <Link href={passage.href}>{passage.href}</Link>
      </p>
      {passage.sourceTitle ? (
        <p>
          {t("source")}
          {": "}
          {passage.sourceUrl ? (
            <a href={passage.sourceUrl} rel="noreferrer">
              {passage.sourceTitle}
            </a>
          ) : (
            passage.sourceTitle
          )}
        </p>
      ) : null}
    </li>
  );
}
