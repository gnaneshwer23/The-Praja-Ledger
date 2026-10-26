import { seats as staticSeats } from "../../data/constituencies";
import { entries as staticEntries, leaders as staticLeaders, type Entry } from "../../data/ledger";
import {
  compiledPromiseCount as staticPromiseCount,
  manifestos as staticManifestos,
} from "../../data/manifestos";
import { compiledFinance, type FinanceTables } from "./map";
import { readPublicEdition } from "./load";

export async function getEdition() {
  return readPublicEdition();
}

export async function getLeaders() {
  const edition = await readPublicEdition();
  return edition?.leaders ?? staticLeaders;
}

export async function getLeader(slug: string) {
  const leaders = await getLeaders();
  return leaders.find((leader) => leader.slug === slug);
}

export async function getEntries() {
  const edition = await readPublicEdition();
  return edition?.entries ?? staticEntries;
}

export async function getEntriesBySection(section: Entry["section"]) {
  const entries = await getEntries();
  return entries.filter((entry) => entry.section === section);
}

export async function getEntriesByIds(ids: string[]) {
  const entries = await getEntries();
  return ids
    .map((id) => entries.find((entry) => entry.id === id))
    .filter((entry): entry is Entry => Boolean(entry));
}

export async function getSeats() {
  const edition = await readPublicEdition();
  return edition?.seats ?? staticSeats;
}

export async function getSeat(id: string) {
  const seats = await getSeats();
  return seats.find((seat) => seat.id === id);
}

export async function getAffidavits() {
  const edition = await readPublicEdition();
  return edition?.affidavits ?? [];
}

export async function getAffidavitChanges() {
  const edition = await readPublicEdition();
  return edition?.affidavitChanges ?? [];
}

export async function getManifestos() {
  const edition = await readPublicEdition();
  return edition?.manifestos ?? staticManifestos;
}

export async function getManifesto(slug: string) {
  const manifestos = await getManifestos();
  return manifestos.find((manifesto) => manifesto.slug === slug);
}

export async function getPromise(manifestoSlug: string, promiseSlug: string) {
  const manifesto = await getManifesto(manifestoSlug);
  const promise = manifesto?.promises.find((item) => item.slug === promiseSlug);
  if (!manifesto || !promise) return undefined;
  return { manifesto, promise };
}

export async function getPublishedReplies() {
  const edition = await readPublicEdition();
  return edition?.replies ?? [];
}

export async function getCompiledPromiseCount() {
  const manifestos = await getManifestos();
  return manifestos.find((manifesto) => manifesto.slug === "congress-2023")?.promises.length ?? staticPromiseCount;
}

export async function getFinance(): Promise<FinanceTables> {
  const edition = await readPublicEdition();
  return edition?.finance ?? compiledFinance;
}

export async function getLinkedCourtOrders() {
  const edition = await readPublicEdition();
  return edition?.courtOrders ?? [];
}
