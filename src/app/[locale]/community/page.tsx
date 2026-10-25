import { setRequestLocale } from "next-intl/server";
import { AppNav } from "@/components/app-nav";
import { CommunityFeed } from "@/components/community-feed";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <CommunityFeed />
      <AppNav />
    </>
  );
}
