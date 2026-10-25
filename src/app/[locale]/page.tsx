import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("HomePage");
  const locales = await getTranslations("LocaleSwitch");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <nav aria-label={locales("label")} className="mb-10 flex gap-4 text-sm">
        {routing.locales.map((code) => (
          <Link
            key={code}
            href="/"
            locale={code}
            hrefLang={code}
            className={
              code === locale
                ? "underline decoration-stone-950"
                : "underline decoration-stone-400"
            }
          >
            {locales(code)}
          </Link>
        ))}
      </nav>
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-[68ch] text-lg leading-relaxed">{t("lede")}</p>
    </main>
  );
}
