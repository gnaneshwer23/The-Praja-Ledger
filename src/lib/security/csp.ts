/** Enforceable Content-Security-Policy. Development adds script-src 'unsafe-eval' for React; production omits it. */

function httpsOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed.startsWith("https://")) return null;
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return null;
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy(env: {
  nodeEnv?: string;
  supabaseUrl?: string;
}): string {
  const supabase = httpsOrigin(env.supabaseUrl);
  const connect = ["'self'", "https://challenges.cloudflare.com"];
  if (supabase) connect.push(supabase);
  const script = ["'self'", "'unsafe-inline'"];
  if (env.nodeEnv === "development") script.push("'unsafe-eval'");
  script.push("https://challenges.cloudflare.com");
  const directives = [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connect.join(" ")}`,
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (env.nodeEnv === "production") directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
