import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions, readSupabasePublicEnv } from "./lib/auth/env";
import { SESSION_COOKIE, adminAccess, isAdminPath, isAdminPublicPath } from "./lib/auth/gate";
import { routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

function localeFrom(pathname: string) {
  return pathname.startsWith("/te/") || pathname === "/te" ? "te" : "en";
}

export default async function proxy(request: NextRequest) {
  const intlResponse = handleI18n(request);
  if (intlResponse.headers.get("location")) return intlResponse;

  const { pathname } = request.nextUrl;
  if (!isAdminPath(pathname)) return intlResponse;

  const locale = localeFrom(pathname);
  const signIn = request.nextUrl.clone();
  signIn.pathname = `/${locale}/admin/sign-in`;
  signIn.search = "";

  const env = readSupabasePublicEnv();
  if (!env) {
    if (isAdminPublicPath(pathname)) return intlResponse;
    signIn.searchParams.set("notice", "unconfigured");
    return NextResponse.redirect(signIn);
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          intlResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  if (isAdminPublicPath(pathname)) {
    try {
      await supabase.auth.getUser();
    } catch {
      return intlResponse;
    }
    return intlResponse;
  }

  let userId: string | null = null;
  let currentLevel: string | null = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData.user?.id ?? null;
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    currentLevel = assurance?.currentLevel ?? null;
  } catch {
    signIn.searchParams.set("notice", "unavailable");
    return NextResponse.redirect(signIn);
  }

  const started = Number(request.cookies.get(SESSION_COOKIE)?.value);
  const decision = adminAccess({
    configured: true,
    userId,
    currentLevel,
    sessionStartedAt: Number.isFinite(started) ? started : null,
    now: Date.now(),
  });
  if (decision !== "allow") {
    signIn.searchParams.set("notice", decision);
    const redirected = NextResponse.redirect(signIn);
    intlResponse.cookies.getAll().forEach((cookie) => {
      redirected.cookies.set(cookie);
    });
    return redirected;
  }

  const { data: staff, error } = await supabase.from("v_my_staff").select("role").maybeSingle();
  if (error || !staff) {
    signIn.searchParams.set("notice", error ? "unavailable" : "staff");
    const redirected = NextResponse.redirect(signIn);
    intlResponse.cookies.getAll().forEach((cookie) => {
      redirected.cookies.set(cookie);
    });
    return redirected;
  }

  return intlResponse;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
