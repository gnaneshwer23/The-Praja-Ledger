import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { launchChecklist, launchStatusKey } from "./checklist";

test("legal sign-off, the publisher, the domain, and Telugu review stay open", () => {
  const items = launchChecklist({
    backupsConfirmed: true,
    everyStaffHasMfa: true,
    rlsTestsRecorded: true,
  });
  const byId = Object.fromEntries(items.map((item) => [item.id, item]));
  expect(byId.legal?.met).toBe(false);
  expect(byId.publisher?.met).toBe(false);
  expect(byId.domain?.met).toBe(false);
  expect(byId.telugu?.met).toBe(false);
  expect(launchStatusKey(byId.legal!)).toBe("launchOpen");
  expect(launchStatusKey(byId.domain!)).toBe("launchOpen");
});

test("the screen that reads the server starts with every line unmet", () => {
  const items = launchChecklist({
    backupsConfirmed: false,
    everyStaffHasMfa: false,
    rlsTestsRecorded: false,
  });
  expect(items.every((item) => item.met === false)).toBe(true);
  expect(items.map((item) => launchStatusKey(item))).not.toContain("launchMet");
});

test("a silence window refusal tells the editor that publishing is refused", () => {
  const english = JSON.parse(readFileSync("messages/en.json", "utf8")) as {
    Admin: { errors: { silence: string } };
    Silence: { banner: string };
  };
  const telugu = JSON.parse(readFileSync("messages/te.json", "utf8")) as {
    Admin: { errors: { silence: string } };
    Silence: { banner: string };
  };
  expect(english.Admin.errors.silence.toLowerCase()).toContain("refused");
  expect(english.Admin.errors.silence.toLowerCase()).toContain("constituency");
  expect(english.Silence.banner).toContain("Section 126");
  expect(telugu.Admin.errors.silence.length).toBeGreaterThan(10);
  expect(telugu.Silence.banner).toContain("126");
});
