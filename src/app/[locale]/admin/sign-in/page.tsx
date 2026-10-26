import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/admin/sign-in-form";
import { readSupabasePublicEnv } from "@/lib/auth/env";

export const instant = false;

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations("Admin");
  const notice = typeof query.notice === "string" ? query.notice : "";

  return (
    <>
      <h2>{t("signInTitle")}</h2>
      <SignInForm
        locale={locale}
        configured={readSupabasePublicEnv() !== null}
        notice={notice}
      />
    </>
  );
}
