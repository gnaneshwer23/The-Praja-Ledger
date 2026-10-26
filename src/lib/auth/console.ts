import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SESSION_COOKIE, adminAccess, type AccessDecision } from "./gate";
import { authCookieOptions, readSupabasePublicEnv } from "./env";
import { createClient } from "./session";

export type StaffRole = "editor" | "reviewer" | "admin";

export type StaffProfile = {
  user_id: string;
  role: StaffRole;
  display_name: string;
};

export function isStaffProfile(value: unknown): value is StaffProfile {
  if (!value || typeof value !== "object") return false;
  const row = value as StaffProfile;
  return (
    typeof row.user_id === "string" &&
    typeof row.display_name === "string" &&
    (row.role === "editor" || row.role === "reviewer" || row.role === "admin")
  );
}

export async function readConsole(): Promise<{
  decision: AccessDecision;
  staff: StaffProfile | null;
  staffError: boolean;
  supabase: SupabaseClient | null;
}> {
  const supabase = await createClient();
  if (!readSupabasePublicEnv() || !supabase) {
    return { decision: "unconfigured", staff: null, staffError: false, supabase: null };
  }
  const { data: userData } = await supabase.auth.getUser();
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const jar = await cookies();
  const started = Number(jar.get(SESSION_COOKIE)?.value);
  const decision = adminAccess({
    configured: true,
    userId: userData.user?.id ?? null,
    currentLevel: assurance?.currentLevel ?? null,
    sessionStartedAt: Number.isFinite(started) ? started : null,
    now: Date.now(),
  });
  if (decision !== "allow") {
    return { decision, staff: null, staffError: false, supabase };
  }
  const { data, error } = await supabase.from("v_my_staff").select("user_id, role, display_name").maybeSingle();
  return {
    decision,
    staff: isStaffProfile(data) ? data : null,
    staffError: Boolean(error),
    supabase,
  };
}

export async function requireConsole(locale: string) {
  const access = await readConsole();
  if (access.decision !== "allow" || !access.staff || !access.supabase) {
    const notice =
      access.decision !== "allow" ? access.decision : access.staffError ? "unavailable" : "staff";
    redirect({ href: `/admin/sign-in?notice=${notice}`, locale });
    throw new Error("redirect");
  }
  return { staff: access.staff, supabase: access.supabase };
}

export async function markSessionStart() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, String(Date.now()), {
    ...authCookieOptions(),
    httpOnly: true,
  });
}
