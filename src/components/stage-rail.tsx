import { getTranslations } from "next-intl/server";

const order = [
  "allegation",
  "fir",
  "chargesheet",
  "charges",
  "trial",
  "verdict",
] as const;

export async function StageRail({ current }: { current: (typeof order)[number] }) {
  const t = await getTranslations("Stages");
  const currentIndex = order.indexOf(current);

  return (
    <ol className="stages" aria-label={t("label")}>
      {order.map((stage, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "now" : "";
        return (
          <li key={stage} className={state} aria-current={state === "now" ? "step" : undefined}>
            <span />
            <small>{t(stage)}</small>
          </li>
        );
      })}
    </ol>
  );
}
