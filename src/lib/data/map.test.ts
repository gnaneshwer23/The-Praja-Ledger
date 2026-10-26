import { describe, expect, test } from "vitest";
import { assembleEdition, linkedCourtOrders, type PublicRows } from "./map";

const rows: PublicRows = {
  people: [
    {
      id: "p-kavitha",
      slug: "k-kavitha",
      name: "K. Kavitha",
      name_te: "కె. కవిత",
      party_id: null,
      role: "Former MLC, no current assembly seat",
      constituency_id: null,
      status_note: null,
    },
    {
      id: "p-revanth",
      slug: "revanth-reddy",
      name: "A. Revanth Reddy",
      name_te: "అనుముల రేవంత్ రెడ్డి",
      party_id: "congress",
      role: "Chief Minister, MLA for Kodangal",
      constituency_id: "ac-kodangal",
      status_note: null,
    },
  ],
  parties: [{ id: "congress", name: "Congress" }],
  entries: [
    {
      person_id: "p-revanth",
      external_id: "PL-C-03",
      title: "Kaleshwaram report and the High Court order",
      body: "The Hans India reported the order. The court order is not linked.",
      status_line: "Media report. The order is not linked.",
      section: "cases",
      tone: "pending",
      verify: true,
      source_id: "media-hans",
    },
  ],
  sources: [
    {
      id: "media-hans",
      type: "MEDIA",
      url: "https://www.thehansindia.com/telangana/big-relief-for-kcr-harish-rao-hc-rules-no-action-on-kaleshwaram-report-1068423",
      title: "Big relief for KCR, Harish Rao: HC rules 'no action' on Kaleshwaram report",
      publisher: "The Hans India",
      published_on: null,
    },
    {
      id: "court-missing",
      type: "COURT",
      url: null,
      title: "Telangana High Court order on the Kaleshwaram commission report",
      publisher: "Telangana High Court",
      published_on: null,
    },
  ],
  cases: [{ slug: "PL-C-03" }],
  promises: [
    { external_id: "congress-2023:gruha-jyothi", current_status: "partial" },
    { external_id: "congress-2023:cheyutha-pension", current_status: "not" },
  ],
  constituencies: [{ id: "ac-kodangal", kind: "AC", number: 72, name: "Kodangal" }],
  datasets: [{ key: "elections", data: { presentation: "separate-records" } }],
};

describe("public view assembly", () => {
  test("keeps verify, leaves Kavitha's party empty, and drops an unlinked court order", () => {
    const edition = assembleEdition(rows);
    expect(edition).not.toBeNull();
    const kavitha = edition?.leaders.find((leader) => leader.slug === "k-kavitha");
    expect(kavitha?.party).toBe("Not compiled yet");
    expect(kavitha).not.toHaveProperty("affidavit");
    const kaleshwaram = edition?.entries.find((entry) => entry.id === "PL-C-03");
    expect(kaleshwaram?.verify).toBe(true);
    expect(kaleshwaram?.sources.map((source) => source.url)).toEqual([
      "https://www.thehansindia.com/telangana/big-relief-for-kcr-harish-rao-hc-rules-no-action-on-kaleshwaram-report-1068423",
    ]);
    expect(edition?.courtOrders).toEqual([]);
    expect(linkedCourtOrders(rows.sources)).toEqual([]);
    const kodangal = edition?.seats.find((seat) => seat.id === "ac-kodangal");
    expect(kodangal?.memberName).toBe("Anumula Revanth Reddy");
    const congress = edition?.manifestos.find((manifesto) => manifesto.slug === "congress-2023");
    const gruha = congress?.promises.find((promise) => promise.slug === "gruha-jyothi");
    const cheyutha = congress?.promises.find((promise) => promise.slug === "cheyutha-pension");
    expect(gruha?.quote).toBeNull();
    expect(gruha?.status).toBe("partial");
    expect(cheyutha?.status).toBe("unverified");
    expect(edition?.entries.some((entry) => entry.id === "PL-H-01")).toBe(true);
  });
});
