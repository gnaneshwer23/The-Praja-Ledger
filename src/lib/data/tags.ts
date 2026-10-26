/** Tags a later publish can pass to revalidateTag(tag, "max"). */
export const HOME_TAG = "home";

export function personTag(slug: string) {
  return `person:${slug}`;
}

export function caseTag(slug: string) {
  return `case:${slug}`;
}

export function constituencyTag(id: string) {
  return `constituency:${id}`;
}
