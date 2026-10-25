"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function AskForm({
  leaders,
}: {
  leaders: { slug: string; name: string; office: string }[];
}) {
  const t = useTranslations("Ask");
  const [leader, setLeader] = useState(leaders[0]?.slug ?? "");
  const [question, setQuestion] = useState("");
  const [preview, setPreview] = useState("");
  const [note, setNote] = useState("");

  const chosen = leaders.find((item) => item.slug === leader);

  return (
    <form
      className="ask-form"
      onSubmit={(event) => {
        event.preventDefault();
        const text = question.trim();
        if (!text) {
          setPreview("");
          setNote(t("empty"));
          return;
        }
        setNote("");
        setPreview(text);
      }}
    >
      <h1>{t("title")}</h1>
      <p className="lede">{t("lede")}</p>
      <label htmlFor="ask-leader">{t("leader")}</label>
      <select
        id="ask-leader"
        value={leader}
        onChange={(event) => setLeader(event.target.value)}
      >
        {leaders.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name} — {item.office}
          </option>
        ))}
      </select>
      <label htmlFor="ask-question">{t("question")}</label>
      <textarea
        id="ask-question"
        rows={4}
        value={question}
        placeholder={t("placeholder")}
        onChange={(event) => setQuestion(event.target.value)}
      />
      <button className="ink-button" type="submit">
        {t("submit")}
      </button>
      {note ? <p className="quiet">{note}</p> : null}
      {preview ? (
        <article className="feed-card">
          <h2>{t("preview")}</h2>
          <p>{preview}</p>
          <p className="quiet">
            {chosen?.name}. {t("result")}
          </p>
        </article>
      ) : null}
    </form>
  );
}
