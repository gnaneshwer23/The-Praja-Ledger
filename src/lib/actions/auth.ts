"use server";

import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { markSessionStart } from "@/lib/auth/console";
import { readSupabasePublicEnv } from "@/lib/auth/env";
import { createClient } from "@/lib/auth/session";

export type AuthState = {
  error: string;
  ok: boolean;
  qr: string;
  secret: string;
  factorId: string;
};

const empty: AuthState = { error: "", ok: false, qr: "", secret: "", factorId: "" };

function localeOf(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  return locale === "te" ? "te" : "en";
}

export async function requestMagicLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ...empty, error: "email" };
  }
  const env = readSupabasePublicEnv();
  const supabase = await createClient();
  if (!env || !supabase) return { ...empty, error: "not_configured" };

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3010";
  const proto = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const locale = localeOf(formData);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${proto}://${host}/${locale}/admin/auth/callback`,
      shouldCreateUser: false,
    },
  });
  if (error) return { ...empty, error: "link_failed" };
  return { ...empty, ok: true };
}

export async function prepareTotp(_prev: AuthState, _formData: FormData): Promise<AuthState> {
  const env = readSupabasePublicEnv();
  const supabase = await createClient();
  if (!env || !supabase) return { ...empty, error: "not_configured" };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ...empty, error: "link_first" };

  const listed = await supabase.auth.mfa.listFactors();
  if (listed.error) return { ...empty, error: "link_failed" };
  const verified = listed.data?.totp?.find((factor) => factor.status === "verified");
  if (verified) return { ...empty, error: "already", factorId: verified.id };

  for (const factor of listed.data?.totp ?? []) {
    if (factor.status !== "verified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const enrolled = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Praja Ledger",
  });
  if (enrolled.error || !enrolled.data.totp) return { ...empty, error: "link_failed" };
  return {
    error: "",
    ok: true,
    qr: enrolled.data.totp.qr_code,
    secret: enrolled.data.totp.secret,
    factorId: enrolled.data.id,
  };
}

export async function verifyTotp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const code = String(formData.get("code") ?? "").trim();
  const locale = localeOf(formData);
  if (!/^\d{6}$/.test(code)) return { ...empty, error: "code" };

  const env = readSupabasePublicEnv();
  const supabase = await createClient();
  if (!env || !supabase) return { ...empty, error: "code" };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ...empty, error: "code" };

  let factorId = String(formData.get("factorId") ?? "").trim();
  if (!factorId) {
    const listed = await supabase.auth.mfa.listFactors();
    factorId = listed.data?.totp?.[0]?.id ?? "";
  }
  if (!factorId) return { ...empty, error: "code" };

  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) return { ...empty, error: "code" };
  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (verified.error) return { ...empty, error: "code" };

  await markSessionStart();
  redirect({ href: "/admin", locale });
  throw new Error("redirect");
}
