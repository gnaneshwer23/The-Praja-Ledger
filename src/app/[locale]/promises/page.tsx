import { hasLocale } from "next-intl";
import { notFound, permanentRedirect } from "next/navigation";
import { routing } from "@/i18n/routing";

export default async function PromisesRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  permanentRedirect(`/${locale}/manifestos`);
}
