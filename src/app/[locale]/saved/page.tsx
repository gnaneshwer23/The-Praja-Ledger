import { setRequestLocale } from "next-intl/server";
import { AppNav } from "@/components/app-nav";
import { SavedList } from "@/components/saved-list";

export default async function SavedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SavedList />
      <AppNav />
    </>
  );
}
