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

export function affidavitConfirmTarget(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const wrote = row.wrote === true || row.change_written === true;
  const constituencyId = typeof row.constituency_id === "string" ? row.constituency_id : "";
  if (!wrote || !constituencyId) return null;
  return {
    personSlug: typeof row.person_slug === "string" ? row.person_slug : null,
    constituencyId,
  };
}

export function translationApproveTarget(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.public_changed !== true) return null;
  const personSlugs = stringList(row.person_slugs);
  const constituencyIds = stringList(row.constituency_ids);
  const caseSlugs = stringList(row.case_slugs);
  return { personSlugs, constituencyIds, caseSlugs };
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

export function translationTags(target: {
  personSlugs: string[];
  constituencyIds: string[];
  caseSlugs: string[];
} | null) {
  if (!target) return [];
  const tags = [HOME_TAG];
  for (const slug of target.personSlugs) tags.push(personTag(slug));
  for (const id of target.constituencyIds) tags.push(constituencyTag(id));
  for (const slug of target.caseSlugs) tags.push(caseTag(slug));
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
