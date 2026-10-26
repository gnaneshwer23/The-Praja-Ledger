import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getManifestos } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Manifestos" });
  return { title: t("title"), description: t("description") };
}

export default async function ManifestosPage() {
  const t = await getTranslations("Manifestos");
  const manifestos = await getManifestos();

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
