import { expect, test } from "vitest";
import { tagsAfterEntrySave } from "./publish-tags";

test("a work entry publishes tags for the person, the seat, and the home page", () => {
  expect(
    tagsAfterEntrySave({
      kind: "work",
      personSlug: "revanth-reddy",
      constituencyId: "ac-kodangal",
    }),
  ).toEqual(["home", "person:revanth-reddy", "constituency:ac-kodangal"]);
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
