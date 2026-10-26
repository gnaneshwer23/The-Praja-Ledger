import { revalidateTag } from "next/cache";
import { publishTags } from "./publish-tags";

export function revalidatePublished(input: {
  personSlug?: string | null;
  constituencyId?: string | null;
  caseSlug?: string | null;
}) {
  for (const tag of publishTags(input)) {
    revalidateTag(tag, { expire: 0 });
  }
}
