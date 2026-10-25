export function CivicIcon({ name }: { name: "follow" | "ask" | "share" }) {
  return (
    <svg className="civic-icon" viewBox="0 0 64 64" aria-hidden="true">
      {name === "follow" ? (
        <>
          <rect x="8" y="8" width="34" height="48" rx="4" fill="#d4df96" stroke="#102028" strokeWidth="2" />
          <path d="M16 22h18M16 30h14M16 38h10" stroke="#102028" strokeWidth="2" strokeLinecap="round" />
          <circle cx="46" cy="46" r="11" fill="#040e21" />
          <path d="M46 40.5v11M40.5 46h11" stroke="#e7efc2" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {name === "ask" ? (
        <>
          <rect x="6" y="8" width="52" height="36" rx="8" fill="#e7f0ea" stroke="#102028" strokeWidth="2" />
          <path d="M20 44l8-8h10" fill="#e7f0ea" stroke="#102028" strokeWidth="2" strokeLinejoin="round" />
          <path
            d="M30 18c0-3.2 6.5-3.2 6.5 1.6 0 3.4-3.2 3.6-3.2 7"
            fill="none"
            stroke="#102028"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="33.2" cy="32.5" r="1.6" fill="#0e6f7a" />
        </>
      ) : null}
      {name === "share" ? (
        <>
          <circle cx="16" cy="32" r="8" fill="#d4df96" stroke="#102028" strokeWidth="2" />
          <circle cx="46" cy="14" r="8" fill="#ffffff" stroke="#102028" strokeWidth="2" />
          <circle cx="46" cy="50" r="8" fill="#ffffff" stroke="#102028" strokeWidth="2" />
          <path d="M23 27.5 39 17.5M23 36.5 39 46.5" stroke="#102028" strokeWidth="2" />
        </>
      ) : null}
    </svg>
  );
}

export function RegisterMark({ kind }: { kind: "cases" | "promises" | "leaders" }) {
  return (
    <svg className="register-mark" viewBox="0 0 132 88" aria-hidden="true">
      {kind === "cases" ? (
        <>
          <path d="M16 36h100" stroke="#c5d2cb" strokeWidth="2" />
          {[16, 36, 56, 76, 96, 116].map((x, index) => (
            <circle
              key={x}
              cx={x}
              cy="36"
              r={index === 2 ? 7 : 5}
              fill={index < 2 ? "#102028" : "#ffffff"}
              stroke={index === 2 ? "#0e6f7a" : "#102028"}
              strokeWidth={index === 2 ? 3 : 2}
            />
          ))}
          <rect x="14" y="52" width="104" height="22" rx="4" fill="#e7f0ea" stroke="#102028" strokeWidth="1.5" />
          <path d="M22 63h40M22 69h28" stroke="#102028" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "promises" ? (
        <>
          <rect x="28" y="10" width="76" height="68" rx="6" fill="#ffffff" stroke="#102028" strokeWidth="2" />
          <path d="M28 24h76" stroke="#102028" strokeWidth="2" />
          <rect x="38" y="34" width="18" height="12" rx="2" fill="#102028" />
          <rect x="62" y="34" width="18" height="12" rx="2" fill="none" stroke="#102028" strokeWidth="2" />
          <rect x="86" y="34" width="18" height="12" rx="2" fill="none" stroke="#102028" strokeWidth="2" strokeDasharray="3 2" />
          <path d="M38 58h52M38 66h36" stroke="#102028" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "leaders" ? (
        <>
          <rect x="8" y="18" width="26" height="52" rx="4" fill="#e7f0ea" stroke="#102028" strokeWidth="2" />
          <rect x="38" y="18" width="26" height="52" rx="4" fill="#d4df96" stroke="#102028" strokeWidth="2" />
          <rect x="68" y="18" width="26" height="52" rx="4" fill="#ffffff" stroke="#102028" strokeWidth="2" />
          <rect x="98" y="18" width="26" height="52" rx="4" fill="#ffffff" stroke="#102028" strokeWidth="2" strokeDasharray="4 3" />
          <path d="M14 58h14M44 58h14M74 58h14M104 58h14" stroke="#102028" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}
