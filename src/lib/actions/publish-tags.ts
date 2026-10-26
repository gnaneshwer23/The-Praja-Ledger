import { caseTag, constituencyTag, HOME_TAG, personTag } from "../data/tags";

export function publishTags(input: {
  personSlug?: string | null;
  constituencyId?: string | null;
  caseSlug?: string | null;
}) {
  const tags = [HOME_TAG];
  if (input.personSlug) tags.push(personTag(input.personSlug));
  if (input.constituencyId) tags.push(constituencyTag(input.constituencyId));
  if (input.caseSlug) tags.push(caseTag(input.caseSlug));
  return tags;
}

export function tagsAfterEntrySave(input: {
  kind: "work" | "issue";
  personSlug?: string | null;
  constituencyId?: string | null;
}) {
  if (input.kind !== "work") return [];
  return publishTags(input);
}
