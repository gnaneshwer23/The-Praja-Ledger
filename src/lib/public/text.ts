/** Telugu record text is used only after a person approves it. English stays otherwise. */
export function localizedText(locale: string, english: string, telugu?: string | null) {
  const translated = telugu?.trim() ?? "";
  if (locale === "te" && translated) return translated;
  return english;
}
