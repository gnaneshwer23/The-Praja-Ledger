import { acceptPublicPost, ownerCall, publicNotice, redirectNotice } from "@/lib/public/accept";
import { publicIssueCodes, replyFormSchema } from "@/lib/schemas/public-form";

export async function POST(request: Request) {
  const form = await request.formData();
  const accepted = await acceptPublicPost(request, form);
  if (accepted.gate !== "ok") return redirectNotice(request, accepted.back, accepted.gate);

  const parsed = replyFormSchema.safeParse({
    publicId: String(form.get("publicId") ?? ""),
    officeName: String(form.get("officeName") ?? ""),
    body: String(form.get("body") ?? ""),
    officeEmail: String(form.get("officeEmail") ?? ""),
  });
  if (!parsed.success) {
    return redirectNotice(request, accepted.back, publicNotice(publicIssueCodes(parsed.error)[0] ?? "body"));
  }

  const body = parsed.data.body.trim();
  const code = await ownerCall(
    "select public.rpc_submit_reply($1, $2, $3, $4, $5, $6)",
    [
      parsed.data.publicId.trim(),
      parsed.data.officeName.trim(),
      body,
      parsed.data.officeEmail.trim() || null,
      accepted.ipHash,
      body,
    ],
  );
  return redirectNotice(request, accepted.back, code || "reply_sent");
}
