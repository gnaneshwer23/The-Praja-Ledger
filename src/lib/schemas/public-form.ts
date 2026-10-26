import { z } from "zod";

const publicIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const phoneRun = /\d{10}/;

export const correctionEntityTypes = ["entry", "case", "promise"] as const;

function emailIssue(value: string, path: string, ctx: z.RefinementCtx) {
  const email = value.trim();
  if (!email) return;
  if (!emailPattern.test(email) || phoneRun.test(email)) {
    ctx.addIssue({ code: "custom", path: [path], message: "email" });
  }
}

export const correctionFormSchema = z
  .object({
    entityType: z.string(),
    publicId: z.string(),
    body: z.string(),
    sourceUrl: z.string(),
    contactEmail: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!correctionEntityTypes.includes(value.entityType as (typeof correctionEntityTypes)[number])) {
      ctx.addIssue({ code: "custom", path: ["entityType"], message: "record" });
    }
    if (!publicIdPattern.test(value.publicId.trim())) {
      ctx.addIssue({ code: "custom", path: ["publicId"], message: "record" });
    }
    if (!value.body.trim() || value.body.trim().length > 4000) {
      ctx.addIssue({ code: "custom", path: ["body"], message: "body" });
    }
    const url = value.sourceUrl.trim();
    if (url && (!url.startsWith("https://") || url.length > 2000)) {
      ctx.addIssue({ code: "custom", path: ["sourceUrl"], message: "url" });
    }
    emailIssue(value.contactEmail, "contactEmail", ctx);
  });

export const replyFormSchema = z
  .object({
    publicId: z.string(),
    officeName: z.string(),
    body: z.string(),
    officeEmail: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!publicIdPattern.test(value.publicId.trim())) {
      ctx.addIssue({ code: "custom", path: ["publicId"], message: "record" });
    }
    const name = value.officeName.trim();
    const body = value.body.trim();
    if (!name || name.length > 200) {
      ctx.addIssue({ code: "custom", path: ["officeName"], message: "office" });
    }
    if (!body || body.length > 4000) {
      ctx.addIssue({ code: "custom", path: ["body"], message: "body" });
    }
    if (name.includes("@") || body.includes("@") || phoneRun.test(name) || phoneRun.test(body)) {
      ctx.addIssue({ code: "custom", path: ["body"], message: "personal" });
    }
    emailIssue(value.officeEmail, "officeEmail", ctx);
  });

export function publicIssueCodes(error: z.ZodError) {
  return [...new Set(error.issues.map((issue) => issue.message))];
}
