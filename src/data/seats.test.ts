import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { getSeat, seatId, seats } from "./constituencies";
import { getLeader, leaders } from "./ledger";
import { blockForRecord, profileBlockIds } from "./profile";

test("profile blocks stay in the published order", () => {
  expect(profileBlockIds).toEqual([
    "office",
    "education",
    "income",
    "assets",
    "affidavitChange",
    "estimates",
    "cases",
    "legislature",
    "constituency",
    "minister",
    "business",
    "conduct",
  ]);
});

test("every leader record is placed in one profile block", () => {
  const missing = leaders.flatMap((leader) =>
    leader.recordIds
      .filter((id) => !blockForRecord(id))
      .map((id) => `${leader.slug}:${id}`),
  );
  expect(missing).toEqual([]);
});

test("the leader page does not restore an image tag", () => {
  const source = readFileSync("src/app/[locale]/leaders/[slug]/page.tsx", "utf8");
  expect(source.includes("<img")).toBe(false);
});

test("there is a page for every assembly and Lok Sabha seat", () => {
  const assembly = seats.filter((seat) => seat.kind === "AC");
  const parliament = seats.filter((seat) => seat.kind === "PC");

  expect(assembly).toHaveLength(119);
  expect(parliament).toHaveLength(17);
  expect(new Set(seats.map((seat) => seat.id)).size).toBe(136);
  expect(assembly.map((seat) => seat.number)).toEqual(
    Array.from({ length: 119 }, (_, index) => index + 1),
  );
  expect(parliament.map((seat) => seat.number)).toEqual(
    Array.from({ length: 17 }, (_, index) => index + 1),
  );
  expect(assembly.filter((seat) => seat.reservationCategory === "SC")).toHaveLength(19);
  expect(assembly.filter((seat) => seat.reservationCategory === "ST")).toHaveLength(12);
  expect(assembly.filter((seat) => seat.reservationCategory === "General")).toHaveLength(88);
  expect(parliament.every((seat) => seat.reservationCategory === undefined)).toBe(true);

  for (const seat of assembly) {
    if (seat.name.includes("(SC)")) expect(seat.reservationCategory).toBe("SC");
    else if (seat.name.includes("(ST)")) expect(seat.reservationCategory).toBe("ST");
    else expect(seat.reservationCategory).toBe("General");
    expect(seat.votes).toBeUndefined();
    expect(seat.memberName.trim().length).toBeGreaterThan(0);
    expect(seat.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
  }

  expect(seatId("ac", "Kodangal")).toBe("ac-kodangal");
  expect(seatId("ac", "Secunderabad Cantt. (SC)")).toBe("ac-secunderabad-cantt");
  expect(getSeat("ac-kodangal")?.leaderSlug).toBe("revanth-reddy");
  expect(getSeat("pc-secunderabad")).toMatchObject({
    memberName: "G. Kishan Reddy",
    votes: 473012,
    margin: 49944,
    leaderSlug: "g-kishan-reddy",
  });
  expect(getSeat("pc-hyderabad")?.votes).toBeUndefined();
  expect(getSeat("pc-hyderabad")?.margin).toBe(338087);

  for (const seat of seats) {
    if (!seat.leaderSlug) continue;
    expect(getLeader(seat.leaderSlug)?.slug).toBe(seat.leaderSlug);
  }
});
