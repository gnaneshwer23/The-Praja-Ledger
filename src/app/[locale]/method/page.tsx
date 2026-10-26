import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "MethodPage" });
  return { title: t("title"), description: t("description") };
}

export default async function MethodPage() {
  const t = await getTranslations("MethodPage");
  const manifesto = await getTranslations("MethodManifesto");

  return (
    <article className="method">
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <h2>{t("earnsTitle")}</h2>
      <p>{t("earnsBody")}</p>
      <h2>{t("statusTitle")}</h2>
      <p>{t("statusBody")}</p>
      <h2>{manifesto("title")}</h2>
      <p>{manifesto("intro")}</p>
      <p>{manifesto("delivered")}</p>
      <p>{manifesto("partial")}</p>
      <p>{manifesto("progress")}</p>
      <p>{manifesto("notStarted")}</p>
      <p>{manifesto("dropped")}</p>
      <p>{manifesto("unverified")}</p>
      <h2>{manifesto("rulesTitle")}</h2>
      <p>{manifesto("ruleFrozen")}</p>
      <p>{manifesto("ruleEmpty")}</p>
      <p>{manifesto("ruleMonth")}</p>
      <p>{manifesto("ruleGap")}</p>
      <p>{manifesto("ruleClaim")}</p>
      <h2>{manifesto("freezeTitle")}</h2>
      <p>{manifesto("freezeCongress")}</p>
      <p>{manifesto("freezeBrs2014")}</p>
      <p>{manifesto("freezeBrs2018")}</p>
      <p>{manifesto("freezeBjpUnion")}</p>
      <p>{manifesto("freezeBrs2023")}</p>
      <p>{manifesto("freezeBjp2023")}</p>
      <h2>{t("outTitle")}</h2>
      <p>{t("outBody")}</p>
      <h2>{t("numbersTitle")}</h2>
      <p>{t("numbersBody")}</p>
      <h2>{t("notTitle")}</h2>
      <p>{t("notBody")}</p>
    </article>
  );
}
