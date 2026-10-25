import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { manifestos } from "@/data/manifestos";

export const metadata: Metadata = {
  title: "Manifestos",
  description:
    "Telangana manifesto promises, each on its own page, with a status count only where the list is frozen and the party is in government.",
};

export default async function ManifestosPage() {
  const t = await getTranslations("Manifestos");

  return (
    <>
      <header className="intro page-head">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
      </header>
      <ul className="manifesto-list">
        {manifestos.map((manifesto) => (
          <li key={manifesto.slug}>
            <h2>
              <Link href={`/manifestos/${manifesto.slug}`}>{manifesto.title}</Link>
            </h2>
            <p>
              <span className="chip">{manifesto.party}</span>
            </p>
            {manifesto.inGovernment ? (
              <>
                <p>{t("inGovernment")}</p>
                <p>{manifesto.government === "union" ? t("union") : t("state")}</p>
                {manifesto.swornInLabel ? (
                  <p>{t("since", { date: manifesto.swornInLabel })}</p>
                ) : null}
                <p>
                  {manifesto.listFrozen && manifesto.freezeDate
                    ? t("frozen", { date: manifesto.freezeDate })
                    : t("notCompiled")}
                </p>
              </>
            ) : (
              <p>{t("notInGovernment")}</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
