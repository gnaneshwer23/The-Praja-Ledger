import { expect, test } from "vitest";
import { localizedText } from "./text";

test("Telugu text is shown only when a translation exists", () => {
  expect(localizedText("te", "Chargesheet", "ఛార్జిషీట్")).toBe("ఛార్జిషీట్");
  expect(localizedText("te", "Chargesheet", "  ")).toBe("Chargesheet");
  expect(localizedText("en", "Chargesheet", "ఛార్జిషీట్")).toBe("Chargesheet");
});
