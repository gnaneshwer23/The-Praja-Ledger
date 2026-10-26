import { NextResponse } from "next/server";
import { rpcCode } from "@/lib/actions/rpc-error";
import { connectOwner } from "@/lib/db/owner";
import { hashIp, publicFormConfigured, readClientIp } from "./guards";
import { verifyTurnstile } from "./turnstile";

const publicNotices = new Set([
  "captcha",
  "not_configured",
  "rate",
  "queue",
  "record",
  "url",
  "email",
  "body",
  "personal",
  "office",
  "save_failed",
]);

export function formLocale(value: string) {
  return value === "te" ? "te" : "en";
}

export function safeReturnPath(locale: string, raw: string) {
  const fallback = `/${locale}/corrections`;
  const path = raw.split("?")[0]?.split("#")[0] ?? "";
  if (!path.startsWith(`/${locale}/`)) return fallback;
  if (path.includes("//") || path.includes("\\")) return fallback;
  return path;
}

export function redirectNotice(request: Request, path: string, notice: string) {
  const url = new URL(path, request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

export function publicNotice(code: string) {
  if (code === "reason") return "body";
  return publicNotices.has(code) ? code : "save_failed";
}

export async function acceptPublicPost(request: Request, form: FormData) {
  const locale = formLocale(String(form.get("locale") ?? "en"));
  const back = safeReturnPath(locale, String(form.get("returnTo") ?? ""));
  if (!publicFormConfigured()) return { back, gate: "not_configured" as const, ipHash: "" };
  const ip = readClientIp(request.headers);
  if (!ip) return { back, gate: "not_configured" as const, ipHash: "" };
  const token = String(form.get("cf-turnstile-response") ?? "");
  if (!token.trim()) return { back, gate: "captcha" as const, ipHash: "" };
  const passed = await verifyTurnstile(token, ip);
  if (!passed) return { back, gate: "captcha" as const, ipHash: "" };
  const salt = process.env.FORM_IP_SALT?.trim() ?? "";
  return { back, gate: "ok" as const, ipHash: hashIp(ip, salt) };
}

export async function ownerCall(sql: string, params: unknown[]) {
  const client = await connectOwner();
  if (!client) return "not_configured";
  try {
    await client.query(sql, params);
    return "";
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return publicNotice(rpcCode(message));
  } finally {
    await client.end();
  }
}
