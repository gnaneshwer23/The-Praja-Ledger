import { revalidateTag } from "next/cache";
import { publishTags, translationApproveTarget, translationTags } from "./publish-tags";

export function revalidatePublished(input: {
  personSlug?: string | null;
  constituencyId?: string | null;
  caseSlug?: string | null;
}) {
  for (const tag of publishTags(input)) {
    revalidateTag(tag, { expire: 0 });
  }
}

export function revalidateTranslation(value: unknown) {
  for (const tag of translationTags(translationApproveTarget(value))) {
    revalidateTag(tag, { expire: 0 });
  }
}
