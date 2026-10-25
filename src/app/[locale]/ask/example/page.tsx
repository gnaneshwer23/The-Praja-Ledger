import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppNav } from "@/components/app-nav";

export default async function ExampleQuestionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Question");

  return (
    <>
      <article className="question-page">
        <p className="kicker">
          {t("title")} · {t("status")}
        </p>
        <h1>{t("heading")}</h1>
        <p>{t("meta")}</p>
        <p>
          <Link href="/manifestos/congress-2023/indiramma-indlu">{t("linked")}</Link>
        </p>
        <h2>{t("office")}</h2>
        <p>{t("officeBody")}</p>
        <p className="quiet">{t("check")}</p>
        <h2>{t("comments")}</h2>
        <p>
          <Link href="/#rules">{t("rules")}</Link>
        </p>
        <p>{t("reviewed")}</p>
        <article className="feed-card">
          <p className="example">{t("status")}</p>
          <p>{t("commentExample")}</p>
        </article>
        <form className="comment-row" action="/ask/example">
          <input aria-label={t("add")} placeholder={t("add")} disabled />
          <button className="ink-button" type="button" disabled>
            {t("post")}
          </button>
        </form>
        <p className="quiet">{t("closed")}</p>
      </article>
      <AppNav />
    </>
  );
}
