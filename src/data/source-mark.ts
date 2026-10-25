import type { Source } from "@/data/ledger";

export type SourceMark = "official" | "media" | "claim";

const mediaPublishers = [
  "The Times of India",
  "The Hindu",
  "Press Trust of India",
  "Siasat",
  "The Indian Express",
  "Deccan Chronicle",
  "ThePrint",
  "The Hans India",
  "Business Standard",
  "The News Minute",
  "The South First",
  "The New Indian Express",
];

export function sourceMark(source: Source | undefined): SourceMark | null {
  if (!source) return null;
  const { publisher, title } = source;

  if (mediaPublishers.some((name) => publisher.includes(name))) return "media";
  if (publisher === "PRS Legislative Research") return null;
  if (title.includes("Socio-Economic Outlook")) return "claim";
  if (
    publisher === "Election Commission of India" ||
    publisher === "Ministry of Coal" ||
    publisher === "Ministry of Home Affairs" ||
    publisher === "Lok Sabha" ||
    publisher.includes("annexure") ||
    title.includes("Members of the Legislative Assembly") ||
    title.includes("Council of Ministers")
  ) {
    return "official";
  }
  if (publisher === "Government of Telangana") return "official";

  return null;
}

export function swatchClass(mark: SourceMark) {
  if (mark === "official") return "court";
  if (mark === "media") return "media";
  return "claim";
}
