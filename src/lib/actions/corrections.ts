"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "@/i18n/navigation";
import { requireConsole } from "@/lib/auth/console";
import { createServiceClient } from "@/lib/auth/service";
import { revalidatePublished } from "./publish";
import { rpcCode } from "./rpc-error";

function localeOf(formData: FormData) {
  return String(formData.get("locale") ?? "en") === "te" ? "te" : "en";
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

async function fail(locale: string, href: string, codes: string[]): Promise<never> {
  const jar = await cookies();
  jar.set("pl_form_error", [...new Set(codes)].join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60,
  });
  redirect({ href, locale });
  throw new Error("redirect");
}

async function callRpc(supabase: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false as const, code: rpcCode(error.message), data: null };
  return { ok: true as const, code: "", data };
}

function publishPayload(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const row = data as {
    person_slug?: string | null;
    constituency_id?: string | null;
    section?: string | null;
    external_id?: string | null;
  };
  return row;
}

async function storeLetter(file: File) {
  if (file.size === 0 || file.size > 5_000_000) return { ok: false as const, code: "letter" };
  const extension =
    file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "";
  if (!extension) return { ok: false as const, code: "letter" };
  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const service = createServiceClient();
  if (!service) return { ok: false as const, code: "archive_not_configured" };
  const uploaded = await service.storage.from("replies").upload(`${sha256}.${extension}`, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (uploaded.error) return { ok: false as const, code: "letter" };
  return { ok: true as const, path: `replies/${sha256}.${extension}`, sha256 };
}

export async function applyCorrection(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/corrections";
  const access = await requireConsole(locale);
  if (access.staff.role === "editor") return fail(locale, href, ["forbidden"]);
  const note = field(formData, "note").trim();
  const auditId = field(formData, "auditId").trim();
  const id = field(formData, "id").trim();
  if (!note) return fail(locale, href, ["reason"]);
  if (!/^\d+$/.test(auditId)) return fail(locale, href, ["change"]);
  const saved = await callRpc(access.supabase, "rpc_apply_correction", {
    p_id: id,
    p_fix_audit_id: Number(auditId),
    p_note: note,
    p_reason: note,
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  redirect({ href: "/admin/corrections?saved=1", locale });
}

export async function declineCorrection(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/corrections";
  const access = await requireConsole(locale);
  if (access.staff.role === "editor") return fail(locale, href, ["forbidden"]);
  const note = field(formData, "note").trim();
  const id = field(formData, "id").trim();
  if (!note) return fail(locale, href, ["reason"]);
  const saved = await callRpc(access.supabase, "rpc_decline_correction", {
    p_id: id,
    p_note: note,
    p_reason: note,
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  redirect({ href: "/admin/corrections?saved=1", locale });
}

export async function publishReply(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/replies";
  const access = await requireConsole(locale);
  if (access.staff.role === "editor") return fail(locale, href, ["forbidden"]);
  const reason = field(formData, "reason").trim();
  const id = field(formData, "id").trim();
  const method = field(formData, "method") === "signed_letter" ? "signed_letter" : "email_domain";
  if (!reason) return fail(locale, href, ["reason"]);

  let letterPath: string | null = null;
  let letterSha: string | null = null;
  if (method === "signed_letter") {
    const file = formData.get("letter");
    if (!(file instanceof File)) return fail(locale, href, ["letter"]);
    const stored = await storeLetter(file);
    if (!stored.ok) return fail(locale, href, [stored.code]);
    letterPath = stored.path;
    letterSha = stored.sha256;
  }

  const saved = await callRpc(access.supabase, "rpc_publish_reply", {
    p_reply_id: id,
    p_method: method,
    p_letter_path: letterPath,
    p_letter_sha256: letterSha,
    p_reason: reason,
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  const payload = publishPayload(saved.data);
  revalidatePublished({
    personSlug: payload?.person_slug,
    constituencyId: payload?.constituency_id,
    caseSlug: payload?.section === "cases" ? payload.external_id : null,
  });
  redirect({ href: "/admin/replies?saved=1", locale });
}

export async function purgeCorrectionEmails(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/corrections";
  const access = await requireConsole(locale);
  if (access.staff.role !== "admin") return fail(locale, href, ["forbidden"]);
  const reason = field(formData, "reason").trim();
  if (!reason) return fail(locale, href, ["reason"]);
  const saved = await callRpc(access.supabase, "rpc_purge_correction_emails", { p_reason: reason });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  redirect({ href: "/admin/corrections?saved=1", locale });
}
