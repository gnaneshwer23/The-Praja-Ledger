import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppNav } from "@/components/app-nav";
import { RegisterMark } from "@/components/civic-icons";

export default async function MePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Me");

  return (
    <>
      <article className="panel me-panel">
        <RegisterMark kind="leaders" />
        <h1>{t("title")}</h1>
        <p className="lede">{t("body")}</p>
      </article>
      <AppNav />
    </>
  );
}
