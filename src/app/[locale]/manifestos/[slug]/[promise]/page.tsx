import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { manifestos, type Citation, type SourceKind } from "@/data/manifestos";
import { getPromise } from "@/lib/data";

export function generateStaticParams() {
  return manifestos.flatMap((manifesto) =>
    manifesto.promises.map((promise) => ({
      slug: manifesto.slug,
      promise: promise.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; promise: string }>;
}): Promise<Metadata> {
  const { locale, slug, promise: promiseSlug } = await params;
  const match = await getPromise(slug, promiseSlug);
  const t = await getTranslations({ locale, namespace: "Manifestos" });
  if (!match) return { title: t("missing") };
  return { title: match.promise.title, description: match.promise.target };
}

function SourceList({
  sources,
  label,
}: {
  sources: Citation[];
  label: (kind: SourceKind) => string;
}) {
  if (sources.length === 0) return null;
  return (
    <ul className="sources">
      {sources.map((source) => (
        <li key={source.url}>
          <a href={source.url} rel="noreferrer">
            {source.title}
          </a>
          {`, ${source.publisher}, ${source.date}. ${label(source.kind)}`}
        </li>
      ))}
    </ul>
  );
}

export default async function PromisePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; promise: string }>;
}) {
  const { locale, slug, promise: promiseSlug } = await params;
  setRequestLocale(locale);
  const match = await getPromise(slug, promiseSlug);
  if (!match) notFound();
  const { manifesto, promise } = match;
  const t = await getTranslations("Manifestos");
  const kindLabel = (kind: SourceKind) => t(`kinds.${kind}`);

  return (
    <article>
      <header className="intro">
        <p>
          <span className="chip">{manifesto.party}</span>
        </p>
        <h1>{promise.title}</h1>
        <p className="status">{t(`statuses.${promise.status}`)}</p>
        <p>
          <Link href={`/manifestos/${manifesto.slug}`}>{manifesto.title}</Link>
        </p>
      </header>
      <div className="promise-fields">
        <section>
          <h2>{t("quote")}</h2>
          <blockquote>{promise.quote ?? t("missing")}</blockquote>
          <p>{promise.quotePage ? t("pageNumber", { page: promise.quotePage }) : t("pageMissing")}</p>
        </section>
        <section>
          <h2>{t("measure")}</h2>
          <p>{promise.measure}</p>
        </section>
        <section>
          <h2>{t("target")}</h2>
          <p>{promise.target}</p>
        </section>
        <section>
          <h2>{t("deadline")}</h2>
          <p>{promise.deadline ?? t("missing")}</p>
        </section>
        <section>
          <h2>{t("responsible")}</h2>
          <p>{promise.responsibility === "union" ? t("union") : t("state")}</p>
        </section>
        <section>
          <h2>{t("achieved")}</h2>
          <p>{promise.achieved ?? t("missing")}</p>
          {promise.achievedAsOf ? <p>{t("asOf", { date: promise.achievedAsOf })}</p> : null}
          <SourceList sources={promise.achievedSources} label={kindLabel} />
        </section>
        {promise.context ? (
          <section>
            <h2>{t("context")}</h2>
            <p>{promise.context}</p>
          </section>
        ) : null}
        <section>
          <h2>{t("gap")}</h2>
          <p>{promise.gap ?? t("missing")}</p>
        </section>
        <section>
          <h2>{t("status")}</h2>
          <p>{t(`statuses.${promise.status}`)}</p>
        </section>
        <section>
          <h2>{t("history")}</h2>
          <ol className="records">
            {promise.history.map((item) => (
              <li key={`${item.asOf}-${item.detail}`} className="record">
                <p className="status">
                  {t(`statuses.${item.status}`)}
                  {" · "}
                  {item.asOf}
                </p>
                <p>{item.detail}</p>
                {item.source ? (
                  <SourceList sources={[item.source]} label={kindLabel} />
                ) : (
                  <p className="sources">{t("missing")}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <p className="table-note">
        <Link href={`/manifestos/${manifesto.slug}`}>{manifesto.title}</Link>
        {" · "}
        <Link href="/manifestos">{t("back")}</Link>
      </p>
    </article>
  );
}
