import { getTranslations } from "next-intl/server";

const steps = ["step1Title", "step2Title", "step3Title", "step4Title"] as const;

function StepGlyph({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="6" y="7" width="20" height="13" rx="3" fill="none" stroke="#040e21" strokeWidth="1.6" />
        <path d="M12 20l3-3h4" fill="none" stroke="#040e21" strokeWidth="1.6" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="12" cy="14" r="4" fill="none" stroke="#040e21" strokeWidth="1.6" />
        <circle cx="21" cy="14" r="4" fill="#040e21" />
        <path d="M7 24c1.2-3 3-4.5 5-4.5s3.8 1.5 5 4.5M16 24c1.2-3 3-4.5 5-4.5s3.8 1.5 5 4.5" fill="none" stroke="#040e21" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (index === 2) {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 14h16v10H8z" fill="none" stroke="#040e21" strokeWidth="1.6" />
        <path d="M8 14l8 6 8-6" fill="none" stroke="#040e21" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="8" y="6" width="16" height="20" rx="2" fill="none" stroke="#040e21" strokeWidth="1.6" />
      <path d="M12 16l2.5 2.5L20 13" fill="none" stroke="#040e21" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export async function QuestionPath() {
  const t = await getTranslations("Landing");

  return (
    <ol className="path" aria-label={t("stepsTitle")}>
      {steps.map((key, index) => (
        <li key={key}>
          <span className="path-node">
            <StepGlyph index={index} />
            <b>{index + 1}</b>
          </span>
          <strong>{t(key)}</strong>
        </li>
      ))}
    </ol>
  );
}
