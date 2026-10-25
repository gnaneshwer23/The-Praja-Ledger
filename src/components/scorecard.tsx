export function Scorecard({
  visible,
  monthLabel,
  asOfLabel,
  counts,
  totalLabel,
  total,
}: {
  visible: boolean;
  monthLabel: string;
  asOfLabel: string;
  counts: { key: string; label: string; value: number }[];
  totalLabel: string;
  total: number;
}) {
  if (!visible) return null;

  return (
    <section className="scorecard" data-testid="scorecard" aria-label={monthLabel}>
      <p>{monthLabel}</p>
      <p className="quiet">{asOfLabel}</p>
      <div className="scorecard-counts">
        {counts
          .filter((item) => item.value > 0)
          .map((item) => (
            <div key={item.key}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        <div>
          <strong>{total}</strong>
          <span>{totalLabel}</span>
        </div>
      </div>
    </section>
  );
}
