/**
 * Public Supabase Auth settings. The service-role key is read only in
 * src/lib/auth/service.ts and is never returned here.
 */
export function readSupabasePublicEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !anonKey) return null;
  if (!url.startsWith("https://")) return null;
  return { url, anonKey };
}

export function authCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  };
}
