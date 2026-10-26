import { getTranslations } from "next-intl/server";
import { launchChecklist, launchStatusKey } from "@/lib/launch/checklist";

export async function LaunchChecklist() {
  const t = await getTranslations("Admin");
  const items = launchChecklist({
    backupsConfirmed: false,
    everyStaffHasMfa: false,
    rlsTestsRecorded: false,
  });
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());
  const cronConfigured = Boolean(process.env.CRON_SECRET?.trim());

  return (
    <section aria-labelledby="launch-checklist">
      <h2 id="launch-checklist">{t("launchTitle")}</h2>
      <p>{t("launchIntro")}</p>
      <ul>
        <li>
          {t("databaseSignal")}: {databaseConfigured ? t("signalSet") : t("signalMissing")}
        </li>
        <li>
          {t("cronSignal")}: {cronConfigured ? t("signalSet") : t("signalMissing")}
        </li>
        {items.map((item) => (
          <li key={item.id}>
            {t(`launchItems.${item.id}`)}: {t(launchStatusKey(item))}
          </li>
        ))}
      </ul>
    </section>
  );
}
