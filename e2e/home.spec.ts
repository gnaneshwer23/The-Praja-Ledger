import { expect, test } from "@playwright/test";

test("English and Telugu home pages render", async ({ page }) => {
  await page.goto("/en");
  await expect(
    page.getByRole("heading", { name: "Know your leader's record before you vote." }),
  ).toBeVisible();

  await page.goto("/te");
  await expect(
    page.getByRole("heading", {
      name: "ఓటు వేసే ముందు మీ నాయకుడి రికార్డు తెలుసుకోండి.",
    }),
  ).toBeVisible();
});
