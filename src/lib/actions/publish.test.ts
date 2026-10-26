import { expect, test } from "vitest";
import { affidavitConfirmTarget, tagsAfterEntrySave } from "./publish-tags";

test("a work entry publishes tags for the person, the seat, and the home page", () => {
  expect(
    tagsAfterEntrySave({
      kind: "work",
      personSlug: "revanth-reddy",
      constituencyId: "ac-kodangal",
    }),
  ).toEqual(["home", "person:revanth-reddy", "constituency:ac-kodangal"]);
});

test("an affidavit confirm refreshes the seat only when a row was written", () => {
  expect(affidavitConfirmTarget({ wrote: false, change_written: false, constituency_id: "ac-kodangal" })).toBeNull();
  expect(affidavitConfirmTarget({
    wrote: true,
    constituency_id: "ac-kodangal",
    person_slug: "revanth-reddy",
  })).toEqual({
    personSlug: "revanth-reddy",
    constituencyId: "ac-kodangal",
  });
  expect(affidavitConfirmTarget({
    wrote: false,
    change_written: true,
    constituency_id: "pc-secunderabad",
    person_slug: null,
  })).toEqual({
    personSlug: null,
    constituencyId: "pc-secunderabad",
  });
});

test("an issue entry waits for a reviewer and does not refresh the public page yet", () => {
  expect(
    tagsAfterEntrySave({
      kind: "issue",
      personSlug: "revanth-reddy",
      constituencyId: "ac-kodangal",
    }),
  ).toEqual([]);
});
