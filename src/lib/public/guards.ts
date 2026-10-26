import { createHash } from "node:crypto";

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function hashIp(ip: string, salt: string) {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function readClientIp(headerStore: Headers) {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim() ?? "";
    if (first) return first;
  }
  const real = headerStore.get("x-real-ip")?.trim() ?? "";
  return real || null;
}

export function turnstileSiteKey() {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  return key || null;
}

/** True only when the bot check, the IP salt, and the owner connection are all set. */
export function publicFormConfigured() {
  const site = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  const salt = process.env.FORM_IP_SALT?.trim() ?? "";
  const database = process.env.DATABASE_URL?.trim() ?? "";
  return Boolean(site && secret && salt && database);
}

export function turnstileAccepted(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  return (payload as { success?: unknown }).success === true;
}

export function looksLikeEmail(value: string) {
  return emailPattern.test(value);
}
