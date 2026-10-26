import { expect, test } from "vitest";
import { silenceSeatLabels } from "./silence";

test("a silence banner names the constituency, or the id when the name is missing", () => {
  const names = new Map([["ac-kodangal", "Kodangal"]]);
  expect(silenceSeatLabels(["ac-kodangal", "pc-unknown"], names)).toBe("Kodangal, pc-unknown");
});
