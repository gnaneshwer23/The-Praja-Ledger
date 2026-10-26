"use server";

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "@/i18n/navigation";
import { requireConsole, type StaffProfile } from "@/lib/auth/console";
import { createServiceClient } from "@/lib/auth/service";
import { CaptureError, readSourceDocument } from "./capture-url";
import { revalidatePublished, revalidateTranslation } from "./publish";
import { affidavitConfirmTarget, tagsAfterEntrySave } from "./publish-tags";
import { reportFailure } from "@/lib/observability/report";
import { rpcCode } from "./rpc-error";
import {
  caseEventFormSchema,
  confirmAffidavitSchema,
  constituencyFormSchema,
  entryFormSchema,
  issueCodes,
  partyFormSchema,
  promiseUpdateFormSchema,
  retractFormSchema,
  reviewFormSchema,
  silenceFormSchema,
  staffFormSchema,
  stageTranslationSchema,
  approveTranslationSchema,
} from "@/lib/schemas/editorial";
import { parseTranslatorCsv } from "@/lib/import/translation";

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

export async function takeFormError() {
  const jar = await cookies();
  const value = jar.get("pl_form_error")?.value ?? "";
  if (value) jar.delete("pl_form_error");
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function callRpc(
  supabase: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
) {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      const code = rpcCode(error.message);
      if (code === "save_failed") await reportFailure("server_action", error.message);
      return { ok: false as const, code, data: null };
    }
    return { ok: true as const, code: "", data };
  } catch (error) {
    await reportFailure("server_action", error);
    return { ok: false as const, code: "save_failed", data: null };
  }
}

type SourceRow = {
  id: string;
  type: string;
  url: string | null;
  sha256: string | null;
};

async function loadSource(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("v_editor_sources")
    .select("id, type, url, sha256")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as SourceRow;
  if (typeof row.id !== "string" || typeof row.type !== "string") return null;
  return row;
}

async function archiveUrl(url: string) {
  let document: Awaited<ReturnType<typeof readSourceDocument>>;
  try {
    document = await readSourceDocument(url);
  } catch (error) {
    if (error instanceof CaptureError) return { ok: false as const, code: "archive" };
    return { ok: false as const, code: "archive" };
  }
  const service = createServiceClient();
  if (!service) return { ok: false as const, code: "archive_not_configured" };
  const objectPath = `${document.sha256}.${document.extension}`;
  const uploaded = await service.storage.from("sources").upload(objectPath, document.bytes, {
    contentType: document.contentType,
    upsert: true,
  });
  if (uploaded.error) return { ok: false as const, code: "archive" };
  return {
    ok: true as const,
    path: `sources/${objectPath}`,
    sha256: document.sha256,
  };
}

async function saveNewSource(
  supabase: SupabaseClient,
  input: {
    sourceType: string;
    url: string;
    title: string;
    publisher: string;
    publishedOn: string;
    reason: string;
  },
) {
  let archived: { path: string; sha256: string } | null = null;
  if (input.url.trim()) {
    const copy = await archiveUrl(input.url.trim());
    if (!copy.ok) return copy;
    archived = { path: copy.path, sha256: copy.sha256 };
  }
  const saved = await callRpc(supabase, "rpc_save_source", {
    p_type: input.sourceType,
    p_url: input.url.trim() || null,
    p_title: input.title.trim() || null,
    p_publisher: input.publisher.trim() || null,
    p_published_on: input.publishedOn.trim() || null,
    p_reason: input.reason.trim(),
  });
  if (!saved.ok) return saved;
  const sourceId = String(saved.data);
  if (archived) {
    const recorded = await callRpc(supabase, "rpc_record_source_archive", {
      p_source_id: sourceId,
      p_archived_path: archived.path,
      p_sha256: archived.sha256,
      p_reason: input.reason.trim(),
    });
    if (!recorded.ok) return recorded;
  }
  return { ok: true as const, code: "", sourceId };
}

export async function saveEntry(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/entries";
  const access = await requireConsole(locale);
  if (access.staff.role === "reviewer") return fail(locale, href, ["forbidden"]);

  let sourceType = field(formData, "sourceType");
  let sourceId = field(formData, "sourceId");
  const sourceMode = field(formData, "sourceMode") === "new" ? "new" : "existing";
  if (sourceMode === "existing") {
    const existing = await loadSource(access.supabase, sourceId);
    if (!existing) return fail(locale, href, ["source"]);
    sourceType = existing.type;
  }

  const parsed = entryFormSchema.safeParse({
    personId: field(formData, "personId"),
    kind: field(formData, "kind"),
    body: field(formData, "body"),
    bodyTe: field(formData, "bodyTe"),
    sourceMode,
    sourceId,
    sourceType,
    url: field(formData, "url"),
    title: field(formData, "title"),
    publisher: field(formData, "publisher"),
    publishedOn: field(formData, "publishedOn"),
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));

  const reason = parsed.data.reason.trim();
  if (parsed.data.sourceMode === "new") {
    const created = await saveNewSource(access.supabase, { ...parsed.data, reason });
    if (!created.ok) return fail(locale, href, [created.code]);
    sourceId = created.sourceId;
  } else {
    const existing = await loadSource(access.supabase, parsed.data.sourceId);
    if (existing?.url && !existing.sha256) {
      const copy = await archiveUrl(existing.url);
      if (!copy.ok) return fail(locale, href, [copy.code]);
      const recorded = await callRpc(access.supabase, "rpc_record_source_archive", {
        p_source_id: existing.id,
        p_archived_path: copy.path,
        p_sha256: copy.sha256,
        p_reason: reason,
      });
      if (!recorded.ok) return fail(locale, href, [recorded.code]);
    }
  }

  const saved = await callRpc(access.supabase, "rpc_save_entry", {
    p_person_id: parsed.data.personId,
    p_kind: parsed.data.kind,
    p_body: parsed.data.body.trim(),
    p_body_te: parsed.data.bodyTe.trim() || null,
    p_source_id: sourceId,
    p_reason: reason,
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);

  const { data: person } = await access.supabase
    .from("v_people")
    .select("slug, constituency_id")
    .eq("id", parsed.data.personId)
    .maybeSingle();
  const row = person as { slug?: string; constituency_id?: string | null } | null;
  const tags = tagsAfterEntrySave({
    kind: parsed.data.kind,
    personSlug: row?.slug ?? null,
    constituencyId: row?.constituency_id ?? null,
  });
  if (tags.length > 0) {
    revalidatePublished({
      personSlug: row?.slug ?? null,
      constituencyId: row?.constituency_id ?? null,
    });
  }
  redirect({ href: "/admin/entries?saved=1", locale });
}

export async function saveCaseEvent(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/cases";
  const access = await requireConsole(locale);
  if (access.staff.role === "reviewer") return fail(locale, href, ["forbidden"]);
  const [caseId, stageIdx] = field(formData, "stage").split("|");
  const source = await loadSource(access.supabase, field(formData, "sourceId"));
  if (!source) return fail(locale, href, ["source"]);
  const parsed = caseEventFormSchema.safeParse({
    caseId,
    stageIdx,
    eventDate: field(formData, "eventDate"),
    note: field(formData, "note"),
    sourceId: source.id,
    sourceType: source.type,
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  if (source.url && !source.sha256) {
    const copy = await archiveUrl(source.url);
    if (!copy.ok) return fail(locale, href, [copy.code]);
    const recorded = await callRpc(access.supabase, "rpc_record_source_archive", {
      p_source_id: source.id,
      p_archived_path: copy.path,
      p_sha256: copy.sha256,
      p_reason: parsed.data.reason.trim(),
    });
    if (!recorded.ok) return fail(locale, href, [recorded.code]);
  }
  const saved = await callRpc(access.supabase, "rpc_add_case_event", {
    p_case_id: parsed.data.caseId,
    p_stage_idx: Number(parsed.data.stageIdx),
    p_event_date: parsed.data.eventDate.trim(),
    p_note: parsed.data.note.trim(),
    p_source_id: source.id,
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  redirect({ href: "/admin/cases?saved=1", locale });
}

export async function savePromiseUpdate(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/promises";
  const access = await requireConsole(locale);
  if (access.staff.role === "reviewer") return fail(locale, href, ["forbidden"]);
  const source = await loadSource(access.supabase, field(formData, "sourceId"));
  if (!source) return fail(locale, href, ["source"]);
  const parsed = promiseUpdateFormSchema.safeParse({
    promiseId: field(formData, "promiseId"),
    status: field(formData, "status"),
    detail: field(formData, "detail"),
    sourceId: source.id,
    sourceType: source.type,
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  if (source.url && !source.sha256) {
    const copy = await archiveUrl(source.url);
    if (!copy.ok) return fail(locale, href, [copy.code]);
    const recorded = await callRpc(access.supabase, "rpc_record_source_archive", {
      p_source_id: source.id,
      p_archived_path: copy.path,
      p_sha256: copy.sha256,
      p_reason: parsed.data.reason.trim(),
    });
    if (!recorded.ok) return fail(locale, href, [recorded.code]);
  }
  const saved = await callRpc(access.supabase, "rpc_update_promise", {
    p_promise_id: parsed.data.promiseId,
    p_status: parsed.data.status,
    p_detail: parsed.data.detail.trim() || null,
    p_source_id: source.id,
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  revalidatePublished({});
  redirect({ href: "/admin/promises?saved=1", locale });
}

export async function retractEntry(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/retract";
  const access = await requireConsole(locale);
  const entryId = field(formData, "entryId");
  const { data } = await access.supabase
    .from("v_editor_entries")
    .select("id, person_slug, constituency_id, source_id")
    .eq("id", entryId)
    .maybeSingle();
  const entry = data as {
    id: string;
    person_slug: string | null;
    constituency_id: string | null;
    source_id: string;
  } | null;
  if (!entry) return fail(locale, href, ["entry"]);
  const source = await loadSource(access.supabase, entry.source_id);
  const parsed = retractFormSchema.safeParse({
    entryId,
    sourceType: source?.type ?? "",
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  const saved = await callRpc(access.supabase, "rpc_retract", {
    p_entry_id: entryId,
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  revalidatePublished({
    personSlug: entry.person_slug,
    constituencyId: entry.constituency_id,
  });
  redirect({ href: "/admin/retract?saved=1", locale });
}

async function reviewAction(formData: FormData, fn: "rpc_approve" | "rpc_send_back") {
  const locale = localeOf(formData);
  const href = "/admin/review";
  const access = await requireConsole(locale);
  if (access.staff.role === "editor") return fail(locale, href, ["forbidden"]);
  const parsed = reviewFormSchema.safeParse({
    target: field(formData, "target"),
    id: field(formData, "id"),
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  const saved = await callRpc(access.supabase, fn, {
    p_target: parsed.data.target,
    p_id: parsed.data.id,
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  if (fn === "rpc_approve") {
    const target = parsed.data.target;
    if (target === "entry") {
      const { data } = await access.supabase
        .from("v_editor_entries")
        .select("person_slug, constituency_id")
        .eq("id", parsed.data.id)
        .maybeSingle();
      const row = data as { person_slug?: string | null; constituency_id?: string | null } | null;
      revalidatePublished({
        personSlug: row?.person_slug ?? null,
        constituencyId: row?.constituency_id ?? null,
      });
    } else {
      const { data } = await access.supabase
        .from("v_editor_cases")
        .select("slug")
        .eq("id", field(formData, "caseId"))
        .maybeSingle();
      const row = data as { slug?: string } | null;
      revalidatePublished({ caseSlug: row?.slug ?? null });
    }
  }
  redirect({ href: "/admin/review?saved=1", locale });
}

export async function approveItem(formData: FormData) {
  await reviewAction(formData, "rpc_approve");
}

export async function sendBackItem(formData: FormData) {
  await reviewAction(formData, "rpc_send_back");
}

function requireAdmin(staff: StaffProfile, locale: string) {
  if (staff.role !== "admin") return fail(locale, "/admin/settings", ["forbidden"]);
  return Promise.resolve();
}

export async function saveStaff(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/settings";
  const access = await requireConsole(locale);
  await requireAdmin(access.staff, locale);
  const parsed = staffFormSchema.safeParse({
    userId: field(formData, "userId"),
    role: field(formData, "role"),
    displayName: field(formData, "displayName"),
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  const saved = await callRpc(access.supabase, "rpc_set_staff", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
    p_display_name: parsed.data.displayName.trim(),
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  redirect({ href: "/admin/settings?saved=1", locale });
}

export async function removeStaff(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/settings";
  const access = await requireConsole(locale);
  await requireAdmin(access.staff, locale);
  const userId = field(formData, "userId");
  const parsed = staffFormSchema.safeParse({
    userId,
    role: "editor",
    displayName: "removed",
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error).filter((code) => code === "reason" || code === "staff_user" || code === "personal"));
  const saved = await callRpc(access.supabase, "rpc_remove_staff", {
    p_user_id: userId,
    p_reason: field(formData, "reason").trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  const service = createServiceClient();
  if (service) {
    await service.auth.admin.signOut(userId, "global");
  }
  redirect({ href: "/admin/settings?saved=1", locale });
}

export async function saveParty(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/settings";
  const access = await requireConsole(locale);
  await requireAdmin(access.staff, locale);
  const parsed = partyFormSchema.safeParse({
    id: field(formData, "id"),
    name: field(formData, "name"),
    nameTe: field(formData, "nameTe"),
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  const saved = await callRpc(access.supabase, "rpc_save_party", {
    p_id: parsed.data.id.trim(),
    p_name: parsed.data.name.trim(),
    p_name_te: parsed.data.nameTe.trim() || null,
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  redirect({ href: "/admin/settings?saved=1", locale });
}

export async function saveConstituency(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/settings";
  const access = await requireConsole(locale);
  await requireAdmin(access.staff, locale);
  const parsed = constituencyFormSchema.safeParse({
    id: field(formData, "id"),
    kind: field(formData, "kind"),
    number: field(formData, "number"),
    name: field(formData, "name"),
    nameTe: field(formData, "nameTe"),
    district: field(formData, "district"),
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  const saved = await callRpc(access.supabase, "rpc_save_constituency", {
    p_id: parsed.data.id.trim(),
    p_kind: parsed.data.kind,
    p_number: Number(parsed.data.number),
    p_name: parsed.data.name.trim(),
    p_name_te: parsed.data.nameTe.trim() || null,
    p_district: parsed.data.district.trim() || null,
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  redirect({ href: "/admin/settings?saved=1", locale });
}

export async function saveSilenceWindow(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/settings";
  const access = await requireConsole(locale);
  await requireAdmin(access.staff, locale);
  const parsed = silenceFormSchema.safeParse({
    id: field(formData, "id"),
    constituencyIds: field(formData, "constituencyIds"),
    startsAt: field(formData, "startsAt"),
    endsAt: field(formData, "endsAt"),
    note: field(formData, "note"),
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  const ids = parsed.data.constituencyIds
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const saved = await callRpc(access.supabase, "rpc_save_silence_window", {
    p_id: parsed.data.id.trim() || null,
    p_constituency_ids: ids,
    p_starts_at: new Date(parsed.data.startsAt).toISOString(),
    p_ends_at: new Date(parsed.data.endsAt).toISOString(),
    p_note: parsed.data.note.trim() || null,
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  redirect({ href: "/admin/settings?saved=1", locale });
}

export async function confirmAffidavit(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/affidavits";
  const access = await requireConsole(locale);
  const parsed = confirmAffidavitSchema.safeParse({
    stageId: field(formData, "stageId"),
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  const saved = await callRpc(access.supabase, "rpc_confirm_affidavit", {
    p_stage_id: parsed.data.stageId.trim(),
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  const target = affidavitConfirmTarget(saved.data);
  if (target) revalidatePublished(target);
  redirect({ href: "/admin/affidavits?saved=1", locale });
}

function canStageTranslation(role: StaffProfile["role"]) {
  return role === "editor" || role === "admin";
}

export async function stageTranslation(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/translations";
  const access = await requireConsole(locale);
  if (!canStageTranslation(access.staff.role)) return fail(locale, href, ["forbidden"]);
  const parsed = stageTranslationSchema.safeParse({
    kind: field(formData, "kind"),
    key: field(formData, "key"),
    field: field(formData, "field"),
    telugu: field(formData, "telugu"),
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  const saved = await callRpc(access.supabase, "rpc_stage_translation", {
    p_kind: parsed.data.kind.trim(),
    p_key: parsed.data.key.trim(),
    p_field: parsed.data.field.trim(),
    p_telugu: parsed.data.telugu.trim(),
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  redirect({ href: "/admin/translations?saved=1", locale });
}

export async function stageTranslationFile(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/translations";
  const access = await requireConsole(locale);
  if (!canStageTranslation(access.staff.role)) return fail(locale, href, ["forbidden"]);
  const reason = field(formData, "reason");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 1_000_000) {
    return fail(locale, href, ["record"]);
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv") && file.type !== "text/csv" && file.type !== "") {
    return fail(locale, href, ["record"]);
  }
  const parsed = parseTranslatorCsv(await file.text(), reason);
  if (parsed.rejections.length > 0) {
    return fail(locale, href, parsed.rejections.map((item) => item.code));
  }
  if (parsed.rows.length === 0) return fail(locale, href, ["telugu"]);
  for (const row of parsed.rows) {
    const saved = await callRpc(access.supabase, "rpc_stage_translation", {
      p_kind: row.kind,
      p_key: row.key,
      p_field: row.field,
      p_telugu: row.telugu,
      p_reason: row.reason,
    });
    if (!saved.ok) return fail(locale, href, [saved.code]);
  }
  redirect({ href: "/admin/translations?saved=1", locale });
}

export async function approveTranslation(formData: FormData) {
  const locale = localeOf(formData);
  const href = "/admin/translations";
  const access = await requireConsole(locale);
  const parsed = approveTranslationSchema.safeParse({
    stageId: field(formData, "stageId"),
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return fail(locale, href, issueCodes(parsed.error));
  const saved = await callRpc(access.supabase, "rpc_approve_translation", {
    p_stage_id: parsed.data.stageId.trim(),
    p_reason: parsed.data.reason.trim(),
  });
  if (!saved.ok) return fail(locale, href, [saved.code]);
  revalidateTranslation(saved.data);
  redirect({ href: "/admin/translations?saved=1", locale });
}
