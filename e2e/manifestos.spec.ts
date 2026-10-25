import { expect, test } from "@playwright/test";

test("manifesto index renders in English and Telugu", async ({ page }) => {
  await page.goto("/en/manifestos");
  await expect(page.getByRole("heading", { name: "Manifestos", exact: true })).toBeVisible();
  await expect(page.getByTestId("scorecard")).toHaveCount(0);

  await page.goto("/te/manifestos");
  await expect(page.getByRole("heading", { name: "మ్యానిఫెస్టోలు", exact: true })).toBeVisible();
  await expect(page.getByTestId("scorecard")).toHaveCount(0);
});
