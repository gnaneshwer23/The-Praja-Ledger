"use client";

import { useTranslations } from "next-intl";
import { stageTranslationFile } from "@/lib/actions/editorial";

export function TranslationUpload({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  return (
    <form action={stageTranslationFile}>
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="translation-file">
        {t("uploadLabel")}
        <input id="translation-file" name="file" type="file" accept=".csv,text/csv" required />
      </label>
      <label htmlFor="translation-file-reason">
        {t("reason")}
        <input id="translation-file-reason" name="reason" required />
      </label>
      <button className="ink-button" type="submit">
        {t("upload")}
      </button>
    </form>
  );
}
