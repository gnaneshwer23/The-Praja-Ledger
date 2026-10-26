import { expect, test } from "@playwright/test";

test("public pages render in English and Telugu", async ({ page }) => {
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

  await page.goto("/en/leaders");
  await expect(page.getByRole("heading", { name: "Leaders", exact: true })).toBeVisible();

  await page.goto("/te/leaders");
  await expect(page.getByRole("heading", { name: "నాయకులు", exact: true })).toBeVisible();

  await page.goto("/en/manifestos");
  await expect(page.getByRole("heading", { name: "Manifestos", exact: true })).toBeVisible();
  await expect(page.getByTestId("scorecard")).toHaveCount(0);

  await page.goto("/te/manifestos");
  await expect(page.getByRole("heading", { name: "మ్యానిఫెస్టోలు", exact: true })).toBeVisible();

  await page.goto("/en/chat");
  await expect(page.getByRole("heading", { name: "Ask the register", exact: true })).toBeVisible();

  await page.goto("/te/chat");
  await expect(page.getByRole("heading", { name: "రిజిస్టర్‌ను అడగండి", exact: true })).toBeVisible();

  await page.goto("/en/constituencies");
  await expect(page.getByRole("heading", { name: "Constituencies", exact: true })).toBeVisible();

  await page.goto("/te/constituencies");
  await expect(page.getByRole("heading", { name: "నియోజకవర్గాలు", exact: true })).toBeVisible();

  await page.goto("/en/elections");
  await expect(page.getByRole("heading", { name: "Elections", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);

  await page.goto("/te/elections");
  await expect(page.getByRole("heading", { name: "ఎన్నికలు", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});
