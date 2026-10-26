import { setRequestLocale } from "next-intl/server";
import { AppNav } from "@/components/app-nav";
import { AskForm } from "@/components/ask-form";
import { getLeaders } from "@/lib/data";

export default async function AskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const leaders = await getLeaders();

  return (
    <>
      <AskForm
        leaders={leaders.map((leader) => ({
          slug: leader.slug,
          name: leader.name,
          office: leader.office,
        }))}
      />
      <AppNav />
    </>
  );
}
