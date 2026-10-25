import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { seats, type ReservationCategory, type Seat } from "@/data/constituencies";

export const metadata: Metadata = {
  title: "Constituencies",
  description:
    "Telangana’s 119 Assembly seats and 17 Lok Sabha seats, with the sitting member named from an opened source.",
};

export default async function ConstituenciesPage() {
  const t = await getTranslations("ConstituenciesPage");
  const seat = await getTranslations("SeatPage");
  const profile = await getTranslations("Profile");
  const assembly = seats.filter((item) => item.kind === "AC");
  const parliament = seats.filter((item) => item.kind === "PC");

  return (
    <>
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <SeatGroup
        title={t("assembly")}
        items={assembly}
        reservationLabel={seat("reservation")}
        missing={profile("missing")}
        categoryLabel={(category) => seat(categoryLabelKey(category))}
      />
      <SeatGroup
        title={t("lokSabha")}
        items={parliament}
        reservationLabel={seat("reservation")}
        missing={profile("missing")}
        categoryLabel={(category) => seat(categoryLabelKey(category))}
      />
    </>
  );
}

function SeatGroup({
  title,
  items,
  reservationLabel,
  missing,
  categoryLabel,
}: {
  title: string;
  items: Seat[];
  reservationLabel: string;
  missing: string;
  categoryLabel: (category: ReservationCategory) => string;
}) {
  return (
    <section>
      <h2>{title}</h2>
      <ul className="index">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/constituencies/${item.id}`}>
              {item.number}. {item.name}
            </Link>
            <p>
              {item.memberName}
              {" · "}
              <span className="chip">{item.party}</span>
              {" · "}
              {reservationLabel}
              {": "}
              {item.reservationCategory ? categoryLabel(item.reservationCategory) : missing}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function categoryLabelKey(category: ReservationCategory) {
  if (category === "SC") return "sc" as const;
  if (category === "ST") return "st" as const;
  return "general" as const;
}
