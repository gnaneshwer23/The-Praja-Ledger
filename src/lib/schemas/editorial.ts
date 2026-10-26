import { z } from "zod";

export const sourceTypes = [
  "COURT",
  "CAG",
  "ECI",
  "SPKR",
  "COMM",
  "MEDIA",
  "GOV",
  "OPP",
  "PARTY",
] as const;

export const tier1SourceTypes = new Set<(typeof sourceTypes)[number]>([
  "COURT",
  "CAG",
  "ECI",
  "SPKR",
]);

export const entryKinds = ["work", "issue"] as const;
export const promiseStatuses = [
  "delivered",
  "partial",
  "not",
  "disputed",
  "progress",
  "unverified",
] as const;
export const staffRoles = ["editor", "reviewer", "admin"] as const;

const blockedWording = /\b(corrupt|scam|guilty|criminal)\b/i;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export function hasBlockedWording(value: string, sourceType: string) {
  if (sourceType === "COURT") return false;
  return blockedWording.test(value);
}

function wordingIssue(
  value: string,
  sourceType: string,
  path: string,
  ctx: z.RefinementCtx,
) {
  if (hasBlockedWording(value, sourceType)) {
    ctx.addIssue({ code: "custom", path: [path], message: "wording" });
  }
}

function reasonIssue(reason: string, sourceType: string, ctx: z.RefinementCtx) {
  if (!reason.trim()) {
    ctx.addIssue({ code: "custom", path: ["reason"], message: "reason" });
    return;
  }
  wordingIssue(reason, sourceType, "reason", ctx);
}

export const entryFormSchema = z
  .object({
    personId: z.string(),
    kind: z.enum(entryKinds),
    body: z.string(),
    bodyTe: z.string(),
    sourceMode: z.enum(["existing", "new"]),
    sourceId: z.string(),
    sourceType: z.string(),
    url: z.string(),
    title: z.string(),
    publisher: z.string(),
    publishedOn: z.string(),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!uuidPattern.test(value.personId)) {
      ctx.addIssue({ code: "custom", path: ["personId"], message: "person" });
    }
    if (!value.body.trim()) {
      ctx.addIssue({ code: "custom", path: ["body"], message: "body" });
    }
    const sourceType = value.sourceType;
    if (value.sourceMode === "existing") {
      if (!uuidPattern.test(value.sourceId)) {
        ctx.addIssue({ code: "custom", path: ["sourceId"], message: "source" });
      }
    } else {
      if (!sourceTypes.includes(sourceType as (typeof sourceTypes)[number])) {
        ctx.addIssue({ code: "custom", path: ["sourceType"], message: "source" });
      }
      if (tier1SourceTypes.has(sourceType as (typeof sourceTypes)[number]) && !value.url.trim()) {
        ctx.addIssue({ code: "custom", path: ["url"], message: "tier1_url" });
      }
      if (value.url.trim() && !value.url.trim().startsWith("https://")) {
        ctx.addIssue({ code: "custom", path: ["url"], message: "url" });
      }
      if (value.publishedOn.trim() && !dayPattern.test(value.publishedOn.trim())) {
        ctx.addIssue({ code: "custom", path: ["publishedOn"], message: "date" });
      }
    }
    wordingIssue(value.body, sourceType, "body", ctx);
    wordingIssue(value.bodyTe, sourceType, "bodyTe", ctx);
    reasonIssue(value.reason, sourceType, ctx);
  });

export const caseEventFormSchema = z
  .object({
    caseId: z.string(),
    stageIdx: z.string(),
    eventDate: z.string(),
    note: z.string(),
    sourceId: z.string(),
    sourceType: z.string(),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!uuidPattern.test(value.caseId)) {
      ctx.addIssue({ code: "custom", path: ["caseId"], message: "case" });
    }
    if (!/^\d+$/.test(value.stageIdx)) {
      ctx.addIssue({ code: "custom", path: ["stageIdx"], message: "stage" });
    }
    if (!dayPattern.test(value.eventDate.trim())) {
      ctx.addIssue({ code: "custom", path: ["eventDate"], message: "date" });
    }
    if (!value.note.trim()) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "body" });
    }
    if (!uuidPattern.test(value.sourceId)) {
      ctx.addIssue({ code: "custom", path: ["sourceId"], message: "source" });
    }
    wordingIssue(value.note, value.sourceType, "note", ctx);
    reasonIssue(value.reason, value.sourceType, ctx);
  });

export const promiseUpdateFormSchema = z
  .object({
    promiseId: z.string(),
    status: z.string(),
    detail: z.string(),
    sourceId: z.string(),
    sourceType: z.string(),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!uuidPattern.test(value.promiseId)) {
      ctx.addIssue({ code: "custom", path: ["promiseId"], message: "promise" });
    }
    if (!promiseStatuses.includes(value.status as (typeof promiseStatuses)[number])) {
      ctx.addIssue({ code: "custom", path: ["status"], message: "status" });
    }
    if (!uuidPattern.test(value.sourceId)) {
      ctx.addIssue({ code: "custom", path: ["sourceId"], message: "source" });
    }
    wordingIssue(value.detail, value.sourceType, "detail", ctx);
    reasonIssue(value.reason, value.sourceType, ctx);
  });

export const retractFormSchema = z
  .object({
    entryId: z.string(),
    sourceType: z.string(),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!uuidPattern.test(value.entryId)) {
      ctx.addIssue({ code: "custom", path: ["entryId"], message: "entry" });
    }
    reasonIssue(value.reason, value.sourceType, ctx);
  });

export const reviewFormSchema = z
  .object({
    target: z.enum(["entry", "case_event"]),
    id: z.string(),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!uuidPattern.test(value.id)) {
      ctx.addIssue({ code: "custom", path: ["id"], message: "save_failed" });
    }
    reasonIssue(value.reason, "", ctx);
  });

export const staffFormSchema = z
  .object({
    userId: z.string(),
    role: z.string(),
    displayName: z.string(),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!uuidPattern.test(value.userId)) {
      ctx.addIssue({ code: "custom", path: ["userId"], message: "staff_user" });
    }
    if (!staffRoles.includes(value.role as (typeof staffRoles)[number])) {
      ctx.addIssue({ code: "custom", path: ["role"], message: "role" });
    }
    if (!value.displayName.trim()) {
      ctx.addIssue({ code: "custom", path: ["displayName"], message: "name" });
    }
    if (value.displayName.includes("@") || /\d{10}/.test(value.displayName)) {
      ctx.addIssue({ code: "custom", path: ["displayName"], message: "personal" });
    }
    reasonIssue(value.reason, "", ctx);
  });

export const partyFormSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    nameTe: z.string(),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(value.id.trim())) {
      ctx.addIssue({ code: "custom", path: ["id"], message: "party" });
    }
    if (!value.name.trim()) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "name" });
    }
    reasonIssue(value.reason, "", ctx);
  });

export const constituencyFormSchema = z
  .object({
    id: z.string(),
    kind: z.string(),
    number: z.string(),
    name: z.string(),
    nameTe: z.string(),
    district: z.string(),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,80}$/.test(value.id.trim())) {
      ctx.addIssue({ code: "custom", path: ["id"], message: "seat" });
    }
    if (value.kind !== "AC" && value.kind !== "PC") {
      ctx.addIssue({ code: "custom", path: ["kind"], message: "seat" });
    }
    if (!/^\d+$/.test(value.number) || Number(value.number) < 1) {
      ctx.addIssue({ code: "custom", path: ["number"], message: "seat" });
    }
    if (!value.name.trim()) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "name" });
    }
    reasonIssue(value.reason, "", ctx);
  });

export const silenceFormSchema = z
  .object({
    id: z.string(),
    constituencyIds: z.string(),
    startsAt: z.string(),
    endsAt: z.string(),
    note: z.string(),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    const ids = value.constituencyIds
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      ctx.addIssue({ code: "custom", path: ["constituencyIds"], message: "seat" });
    }
    const start = Date.parse(value.startsAt);
    const end = Date.parse(value.endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "date" });
    }
    if (value.id.trim() && !uuidPattern.test(value.id.trim())) {
      ctx.addIssue({ code: "custom", path: ["id"], message: "save_failed" });
    }
    reasonIssue(value.reason, "", ctx);
  });

export function issueCodes(error: z.ZodError) {
  return [...new Set(error.issues.map((issue) => issue.message))];
}

export function reviewSides(before: string | null, after: string) {
  const earlier = before?.trim() ? before : null;
  return { before: earlier, after };
}
