import { expect, test } from "vitest";
import { affidavitConfirmTarget, tagsAfterEntrySave, translationApproveTarget, translationTags } from "./publish-tags";

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

test("an approved translation refreshes public pages only when a record field changed", () => {
  const changed = translationApproveTarget({
    public_changed: true,
    person_slugs: ["p8-person"],
    constituency_ids: ["p8-open"],
    case_slugs: [],
  });
  expect(translationTags(changed)).toEqual(["home", "person:p8-person", "constituency:p8-open"]);
  expect(translationApproveTarget({
    public_changed: false,
    person_slugs: ["p8-person"],
    constituency_ids: ["p8-open"],
    case_slugs: ["PL-C-P8"],
  })).toBeNull();
  expect(translationTags(null)).toEqual([]);
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
