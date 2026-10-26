import { getTranslations } from "next-intl/server";
import { seats } from "@/data/constituencies";
import { formatLedgerDate } from "@/lib/admin/format";
import { readLiveSilence, silenceSeatLabels } from "@/lib/data/silence";

export async function SilenceBanner({ locale }: { locale: string }) {
  const windows = await readLiveSilence();
  if (windows.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "Silence" });
  const names = new Map(seats.map((seat) => [seat.id, seat.name]));

  return (
    <aside className="silence-banner" role="status">
      {windows.map((window) => (
        <p key={window.id}>
          {t("banner", {
            seats: silenceSeatLabels(window.constituencyIds, names),
            until: formatLedgerDate(window.endsAt),
          })}
        </p>
      ))}
    </aside>
  );
}
