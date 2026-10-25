import { expect, test } from "@playwright/test";

test("English and Telugu home pages render", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "Praja Ledger" })).toBeVisible();

  await page.goto("/te");
  await expect(page.getByRole("heading", { name: "ప్రజా లెడ్జర్" })).toBeVisible();
});
