import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SESSION_COOKIE } from "@/lib/auth/gate";
import { authCookieOptions, readSupabasePublicEnv } from "@/lib/auth/env";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale } = await context.params;
  const safeLocale = locale === "te" ? "te" : "en";
  const dest = new URL(`/${safeLocale}/admin/sign-in`, request.url);
  const code = request.nextUrl.searchParams.get("code");
  const env = readSupabasePublicEnv();
  if (!code || !env) {
    dest.searchParams.set("notice", "unconfigured");
    return NextResponse.redirect(dest);
  }

  const pending: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const supabase = createServerClient(env.url, env.anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => {
          const index = pending.findIndex((item) => item.name === cookie.name);
          if (index >= 0) pending[index] = cookie;
          else pending.push(cookie);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    dest.searchParams.set("notice", "link_failed");
    return NextResponse.redirect(dest);
  }

  const response = NextResponse.redirect(dest);
  pending.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  response.cookies.set(SESSION_COOKIE, String(Date.now()), {
    ...authCookieOptions(),
    httpOnly: true,
  });
  return response;
}
