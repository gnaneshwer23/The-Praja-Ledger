"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const storageKey = "praja-saved";

type CardCopy = {
  cardKicker: string;
  cardTitle: string;
  cardWho: string;
  cardBody: string;
  cardHearing: string;
  cardSource: string;
  cardTeluguLine: string;
};

export function ShareSheet({
  path,
  english,
  telugu,
}: {
  path: string;
  english: CardCopy;
  telugu: CardCopy;
}) {
  const t = useTranslations("Share");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [inTelugu, setInTelugu] = useState(locale === "te");
  const [notice, setNotice] = useState("");
  const card = inTelugu ? telugu : english;

  function absoluteUrl() {
    const prefix = inTelugu ? "/te" : "/en";
    return `${window.location.origin}${prefix}${path}`;
  }

  function caption() {
    return `${card.cardTitle}. ${card.cardBody} ${card.cardSource}. ${absoluteUrl()}`;
  }

  async function copy(value: string, message: string) {
    await navigator.clipboard.writeText(value);
    setNotice(message);
  }

  function remember() {
    const current = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[];
    const next = current.includes(path) ? current : [...current, path];
    localStorage.setItem(storageKey, JSON.stringify(next));
    setNotice(t("saved"));
  }

  return (
    <>
      <button className="text-button" type="button" onClick={() => setOpen(true)}>
        {t("open")}
      </button>
      {open ? (
        <div className="share-sheet" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <h2 id="share-title">{t("title")}</h2>
              <button className="text-button" type="button" onClick={() => setOpen(false)}>
                {t("close")}
              </button>
            </div>
            <article className="share-card">
              <p className="kicker">{card.cardKicker}</p>
              <h3>{card.cardTitle}</h3>
              <p>{card.cardWho}</p>
              <p>{card.cardBody}</p>
              <p>{card.cardHearing}</p>
              <p>
                {card.cardSource}
                <br />
                <span lang="te">{card.cardTeluguLine}</span>
              </p>
            </article>
            <p className="quiet">{t("note")}</p>
            <div className="share-actions">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(caption())}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("whatsapp")}
              </a>
              <button
                type="button"
                onClick={() => copy(caption(), t("instagramHelp"))}
              >
                {t("instagramStory")}
              </button>
              <button
                type="button"
                onClick={() => copy(caption(), t("instagramHelp"))}
              >
                {t("instagramPost")}
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption())}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("x")}
              </a>
              <button type="button" onClick={() => copy(absoluteUrl(), t("copied"))}>
                {t("copy")}
              </button>
              <button type="button" onClick={remember}>
                {t("save")}
              </button>
            </div>
            <label className="telugu-toggle">
              <input
                type="checkbox"
                checked={inTelugu}
                onChange={(event) => setInTelugu(event.target.checked)}
              />
              {t("telugu")}
            </label>
            <p>
              <Link href={path}>{t("cardLinkNote")}</Link>
            </p>
            {notice ? <p className="quiet">{notice}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
