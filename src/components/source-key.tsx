import { getTranslations } from "next-intl/server";

export async function SourceKey() {
  const t = await getTranslations("Landing");

  return (
    <ul className="legend source-key">
      <li>
        <i className="swatch court" />
        {t("legendCourt")}
      </li>
      <li>
        <i className="swatch media" />
        {t("legendMedia")}
      </li>
      <li>
        <i className="swatch claim" />
        {t("legendClaim")}
      </li>
    </ul>
  );
}
