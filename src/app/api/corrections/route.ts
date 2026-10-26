import { acceptPublicPost, ownerCall, publicNotice, redirectNotice } from "@/lib/public/accept";
import { correctionFormSchema, publicIssueCodes } from "@/lib/schemas/public-form";

export async function POST(request: Request) {
  const form = await request.formData();
  const accepted = await acceptPublicPost(request, form);
  if (accepted.gate !== "ok") return redirectNotice(request, accepted.back, accepted.gate);

  const parsed = correctionFormSchema.safeParse({
    entityType: String(form.get("entityType") ?? ""),
    publicId: String(form.get("publicId") ?? ""),
    body: String(form.get("body") ?? ""),
    sourceUrl: String(form.get("sourceUrl") ?? ""),
    contactEmail: String(form.get("contactEmail") ?? ""),
  });
  if (!parsed.success) {
    return redirectNotice(request, accepted.back, publicNotice(publicIssueCodes(parsed.error)[0] ?? "body"));
  }

  const body = parsed.data.body.trim();
  const code = await ownerCall(
    "select public.rpc_submit_correction($1, $2, $3, $4, $5, $6, $7)",
    [
      parsed.data.entityType,
      parsed.data.publicId.trim(),
      body,
      parsed.data.sourceUrl.trim() || null,
      parsed.data.contactEmail.trim() || null,
      accepted.ipHash,
      body,
    ],
  );
  return redirectNotice(request, accepted.back, code || "sent");
}
