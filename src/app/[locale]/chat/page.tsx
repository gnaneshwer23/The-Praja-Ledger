import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RegisterChat } from "@/components/register-chat";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Chat" });
  return { title: t("title"), description: t("description") };
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Chat");

  return (
    <>
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("lede")}</p>
      </header>
      <RegisterChat />
      <p className="quiet">{t("note")}</p>
    </>
  );
}
