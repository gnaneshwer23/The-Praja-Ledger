import type { Seat } from "../../data/constituencies";
import type { Entry, Leader } from "../../data/ledger";
import type { Citation, Manifesto, ManifestoPromise } from "../../data/manifestos";
import type { Passage } from "./answer";

export type RegisterEdition = {
  leaders: Leader[];
  entries: Entry[];
  seats: Seat[];
  manifestos: Manifesto[];
};

const sectionPath: Record<Entry["section"], string> = {
  cases: "/cases",
  promises: "/manifestos",
  finances: "/finances",
  elections: "/elections",
  changes: "/changes",
};

function entryHref(entry: Entry) {
  if (entry.id === "PL-C-01") return "/cases/formula-e";
  return `${sectionPath[entry.section]}#${entry.id}`;
}

function sourceOf(source?: { title: string; url: string }) {
  if (!source?.title && !source?.url) return {};
  return {
    sourceTitle: source.title || undefined,
    sourceUrl: source.url || undefined,
  };
}

function promiseSource(promise: ManifestoPromise): Citation | undefined {
  return (
    promise.achievedSources[0] ??
    promise.history.find((event) => event.source)?.source ??
    undefined
  );
}

function promiseText(promise: ManifestoPromise) {
  return [promise.title, promise.quote, promise.measure, promise.target, promise.achieved, promise.gap, promise.context]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");
}

export function passagesFromEdition(edition: RegisterEdition): Passage[] {
  const passages: Passage[] = [];

  for (const entry of edition.entries) {
    const text = [entry.title, entry.status, entry.body].filter(Boolean).join(" ");
    if (!text.trim()) continue;
    const source = entry.sources[0];
    passages.push({
      id: entry.id,
      title: entry.title,
      text,
      href: entryHref(entry),
      ...sourceOf(source),
    });
  }

  for (const leader of edition.leaders) {
    const records = leader.recordIds.length > 0 ? `Records: ${leader.recordIds.join(", ")}.` : "";
    const affidavit = leader.affidavit
      ? [leader.affidavit.year, leader.affidavit.assets, leader.affidavit.cases].filter(Boolean).join(". ")
      : "";
    const text = [leader.name, leader.nameTe, leader.office, leader.party, leader.summary, leader.partyHistory, records, affidavit]
      .filter((part) => part && part.trim() && part !== "Not compiled yet")
      .join(" ");
    if (!text.trim()) continue;
    passages.push({
      id: `/leaders/${leader.slug}`,
      title: leader.name,
      text,
      href: `/leaders/${leader.slug}`,
      ...sourceOf(leader.sources[0] ?? leader.affidavit?.source),
    });
  }

  for (const seat of edition.seats) {
    const counts = [
      seat.votes != null ? `Votes recorded: ${seat.votes}.` : "",
      seat.margin != null ? `Margin recorded: ${seat.margin}.` : "",
    ].filter(Boolean);
    const text = [seat.name, seat.kind, String(seat.number), seat.memberName, seat.party, seat.reservationCategory, ...counts]
      .filter((part) => part && String(part).trim())
      .join(" ");
    passages.push({
      id: `/constituencies/${seat.id}`,
      title: seat.name,
      text,
      href: `/constituencies/${seat.id}`,
      ...sourceOf(seat.sources[0]),
    });
  }

  for (const manifesto of edition.manifestos) {
    for (const promise of manifesto.promises) {
      const text = promiseText(promise);
      if (!text) continue;
      const href = `/manifestos/${manifesto.slug}/${promise.slug}`;
      const source = promiseSource(promise);
      passages.push({
        id: href,
        title: promise.title,
        text: [manifesto.title, manifesto.party, text].filter(Boolean).join(" "),
        href,
        sourceTitle: source?.title ?? (promise.quoteUrl ? promise.title : undefined),
        sourceUrl: source?.url ?? promise.quoteUrl ?? undefined,
      });
    }
  }

  return passages.filter((passage) => passage.id.trim() && passage.href.startsWith("/") && passage.text.trim());
}
