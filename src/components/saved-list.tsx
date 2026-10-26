"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SavedList() {
  const t = useTranslations("Saved");
  const share = useTranslations("Share");
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("praja-saved") ?? "[]") as string[];
    setPaths(stored);
  }, []);

  return (
    <section className="panel">
      <h1>{t("title")}</h1>
      {paths.length === 0 ? <p className="empty">{t("empty")}</p> : null}
      <ul className="index">
        {paths.map((path) => (
          <li key={path}>
            <Link href={path}>
              {share("cardTitle")} — {t("open")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
